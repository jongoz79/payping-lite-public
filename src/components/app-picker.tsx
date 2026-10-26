import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppInput, EmptyState, Icon, Loading } from '@/components/ui';
import { getSelectedApps as getStoredSelectedApps, setSelectedApps as setStoredSelectedApps } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  getInstalledApps,
  setSelectedApps as setNativeSelectedApps,
  type InstalledApp,
} from '@/native/capture';

type PickerItem =
  | { type: 'header'; id: string; title: string }
  | { type: 'app'; id: string; app: InstalledApp; selected: boolean };

export function AppPicker({ embedded = false }: { embedded?: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [selected, setSelected] = useState<InstalledApp[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const installed = await getInstalledApps();
      const byPackage = new Map(installed.map((app) => [app.package, app]));
      const stored = getStoredSelectedApps().map(
        (app): InstalledApp =>
          byPackage.get(app.package) ?? { package: app.package, label: app.label, iconUri: '' },
      );
      setApps(installed);
      setSelected(stored);
    } catch {
      Alert.alert(t('errors.noApps'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const items = useMemo<PickerItem[]>(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const matches = (app: InstalledApp) => !normalized || app.label.toLocaleLowerCase().includes(normalized);
    const selectedApps = selected.filter(matches).sort((a, b) => a.label.localeCompare(b.label));
    const selectedPackages = new Set(selected.map((app) => app.package));
    const otherApps = apps
      .filter((app) => !selectedPackages.has(app.package) && matches(app))
      .sort((a, b) => a.label.localeCompare(b.label));
    const result: PickerItem[] = [
      {
        type: 'header',
        id: 'selected-header',
        title: t('appPicker.selected', { count: selected.length }),
      },
      ...selectedApps.map((app): PickerItem => ({ type: 'app', id: app.package, app, selected: true })),
      { type: 'header', id: 'all-header', title: t('appPicker.all') },
      ...otherApps.map((app): PickerItem => ({ type: 'app', id: app.package, app, selected: false })),
    ];
    if (selectedApps.length + otherApps.length === 0) {
      result.push({ type: 'header', id: 'empty', title: t('appPicker.empty') });
    }
    return result;
  }, [apps, query, selected, t]);

  const toggle = useCallback(
    (app: InstalledApp, value: boolean) => {
      const previous = selected;
      const next = value
        ? [...selected.filter((item) => item.package !== app.package), app]
        : selected.filter((item) => item.package !== app.package);
      setSelected(next);
      try {
        setStoredSelectedApps(next);
        setNativeSelectedApps(next);
      } catch {
        setSelected(previous);
        Alert.alert(t('errors.saveFailed'));
      }
    },
    [selected, t],
  );

  const header = (
    <View style={styles.header}>
      <AppInput
        label={t('common.search')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('appPicker.searchPlaceholder')}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
        returnKeyType="search"
      />
      <Text style={[styles.help, { color: theme.textSecondary }]}>{t('appPicker.help')}</Text>
    </View>
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={[styles.list, embedded && styles.embedded]}
      contentContainerStyle={[styles.content, embedded && styles.embeddedContent]}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState icon="application-outline" title={t('appPicker.empty')} body={t('appPicker.help')} />
      }
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!embedded}
      renderItem={({ item }) => {
        if (item.type === 'header') {
          return (
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {item.title}
            </Text>
          );
        }
        const isExpanded = expanded === item.app.package;
        return (
          <View style={[styles.appContainer, { borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSelected }]}>
                {item.app.iconUri ? (
                  <Image source={{ uri: item.app.iconUri }} style={styles.icon} contentFit="contain" />
                ) : (
                  <Icon name="application-outline" size={24} color={theme.text} />
                )}
              </View>
              <View style={styles.appText}>
                <Text style={[styles.label, { color: theme.text }]}>{item.app.label}</Text>
              </View>
              <View style={styles.controls}>
                <Switch
                  accessibilityLabel={t('a11y.toggleApp', { app: item.app.label })}
                  value={item.selected}
                  onValueChange={(value) => toggle(item.app, value)}
                  style={styles.switch}
                  trackColor={{ false: theme.border, true: theme.accentPrimary }}
                  thumbColor={item.selected ? theme.accentInk : theme.backgroundElement}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.showAppDetails', { app: item.app.label })}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => setExpanded(isExpanded ? null : item.app.package)}
                  style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}
                >
                  <Icon name={isExpanded ? 'chevron-up' : 'information-outline'} />
                </Pressable>
              </View>
            </View>
            {isExpanded && (
              <View style={[styles.detail, { backgroundColor: theme.backgroundSelected }]}>
                <Text selectable style={[styles.package, { color: theme.textSecondary }]}>
                  {item.app.package}
                </Text>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  embedded: { flex: 0, flexGrow: 0 },
  content: { flexGrow: 1, paddingBottom: 24 },
  embeddedContent: { flexGrow: 0 },
  header: { gap: 12, paddingBottom: 8 },
  help: { fontSize: 14, lineHeight: 22 },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    paddingTop: 20,
    paddingBottom: 8,
  },
  appContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: { width: 40, height: 40 },
  appText: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0 },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  switch: { minWidth: 52, minHeight: 48 },
  detailButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  detail: { borderRadius: 12, padding: 12, marginBottom: 12, marginLeft: 52 },
  package: { width: '100%', fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  pressed: { opacity: 0.65 },
});
