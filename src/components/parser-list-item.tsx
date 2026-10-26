import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { parserAppLabels, relativeTime } from '@/components/parser-shared';
import { AppButton, Icon } from '@/components/ui';
import type { ParserRow, SelectedAppRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Parser } from '@/parser/engine';

export function ParserListItem({
  row,
  parser,
  selectedApps,
  lastMatched,
  onToggle,
  onEdit,
  onShare,
  onReparse,
  onDelete,
}: {
  row: ParserRow;
  parser: Parser;
  selectedApps: SelectedAppRow[];
  lastMatched: number | null;
  onToggle: () => void;
  onEdit: () => void;
  onShare: () => void;
  onReparse: () => void;
  onDelete: () => void;
}) {
  const { t, language } = useI18n();
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const apps = parserAppLabels(parser, selectedApps);
  const locale = language === 'ms' ? 'ms-MY' : 'en-MY';

  const run = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        >
          <Icon name="bank-outline" color={theme.textSecondary} />
          <View style={styles.text}>
            <Text style={[styles.name, { color: theme.text }]}>{parser.name}</Text>
            <Text style={[styles.metadata, { color: theme.textSecondary }]}>{apps.join(', ')}</Text>
            <Text style={[styles.metadata, { color: theme.textSecondary }]}>
              {t(parser.rules.length === 1 ? 'parsers.rulesOne' : 'parsers.rules', {
                count: parser.rules.length,
              })}{' '}
              ·{' '}
              {lastMatched
                ? t('parsers.lastMatched', {
                    date: relativeTime(lastMatched, locale, t('today.justNow'), t),
                  })
                : t('parsers.neverMatched')}
            </Text>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel={t('a11y.parserEnabled', {
                name: parser.name,
              })}
              value={row.enabled === 1}
              onValueChange={onToggle}
              trackColor={{ false: theme.border, true: theme.accentPrimary }}
              thumbColor={row.enabled === 1 ? theme.accentInk : theme.backgroundElement}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.parserActions', { name: parser.name })}
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [styles.overflow, pressed && styles.pressed]}
          >
            <Icon name="dots-vertical" color={theme.text} />
          </Pressable>
        </View>
      </View>
      {menuVisible && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
          statusBarTranslucent
        >
          <View style={styles.backdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={StyleSheet.absoluteFill}
              onPress={() => setMenuVisible(false)}
            />
            <SafeAreaView edges={['bottom']} style={[styles.menu, { backgroundColor: theme.background }]}>
              <ParserMenuAction icon="pencil-outline" title={t('common.edit')} onPress={() => run(onEdit)} />
              <ParserMenuAction
                icon="share-variant-outline"
                title={t('parsers.shareJson')}
                onPress={() => run(onShare)}
              />
              <ParserMenuAction icon="history" title={t('parsers.reparse')} onPress={() => run(onReparse)} />
              <ParserMenuAction
                icon="delete-outline"
                title={t('common.delete')}
                danger
                onPress={() => run(onDelete)}
              />
              <View style={styles.cancel}>
                <AppButton label={t('common.cancel')} onPress={() => setMenuVisible(false)} />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
}

function ParserMenuAction({
  icon,
  title,
  onPress,
  danger,
}: {
  icon: ComponentProps<typeof Icon>['name'];
  title: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.menuAction, { borderColor: theme.border }]}
    >
      <Icon name={icon} color={danger ? theme.danger : theme.textSecondary} />
      <Text style={[styles.menuActionText, { color: danger ? theme.danger : theme.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
  },
  main: {
    flex: 1,
    flexBasis: 180,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  text: { flex: 1, flexShrink: 1, gap: 3 },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  metadata: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  switchTarget: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflow: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.65 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menu: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  menuAction: {
    minHeight: 56,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuActionText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  cancel: { padding: 16 },
});
