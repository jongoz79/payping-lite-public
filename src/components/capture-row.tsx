import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { Icon } from '@/components/ui';
import type { CaptureRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { InstalledApp } from '@/native/capture';
import { appLabel } from '@/utils/apps';
import { formatAmount, formatSpokenAmount, formatTime } from '@/utils/format';

export function AppIcon({ app, size = 34 }: { app?: InstalledApp; size?: number }) {
  const theme = useTheme();
  if (app?.iconUri) {
    return (
      <Image source={{ uri: app.iconUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    );
  }
  const initials = (app?.label ?? '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={[styles.fallbackIcon, { width: size, height: size, backgroundColor: theme.backgroundSelected }]}
    >
      <Text style={[styles.fallbackIconText, { color: theme.textSecondary }]}>{initials}</Text>
    </View>
  );
}

export function CaptureListItem({
  row,
  app,
  locale,
  receivedLabel,
  paidLabel,
  unknownLabel,
  isExpanded,
  onPress,
  onFlip,
}: {
  row: CaptureRow;
  app?: InstalledApp;
  locale: string;
  receivedLabel: string;
  paidLabel: string;
  unknownLabel: string;
  isExpanded?: boolean;
  onPress?: () => void;
  onFlip?: () => void;
}) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.6;
  const directionColor =
    row.direction === 'in' ? theme.moneyIn : row.direction === 'out' ? theme.moneyOut : theme.textSecondary;
  const directionLabel = row.direction === 'in' ? receivedLabel : row.direction === 'out' ? paidLabel : '';
  const signed = row.amount_minor !== null && (row.direction === 'in' || row.direction === 'out');
  const amountLabel = signed
    ? formatAmount(row.amount_minor, row.currency, row.direction)
    : t('capture.noAmount');
  const flipLabel = row.direction === 'in' ? t('review.flipOut') : t('review.flipIn');

  return (
    <View style={[styles.container, stacked && styles.containerStacked, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        testID={row.confidence === 'high' ? 'capture-confidence-high' : undefined}
        accessibilityLabel={t('a11y.transaction', {
          direction: directionLabel,
          amount: signed
            ? formatSpokenAmount(row.amount_minor, row.currency, language)
            : t('capture.noAmount'),
          name: `${row.counterparty || row.title || unknownLabel}, ${appLabel(app ? [app] : [], row.source_app)}`,
          time: formatTime(row.posted_at, locale),
        })}
        accessibilityHint={onPress ? t('a11y.expandTransaction') : undefined}
        accessibilityState={isExpanded === undefined ? undefined : { expanded: isExpanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.main, stacked && styles.mainStacked, pressed && styles.pressed]}
      >
        <View style={styles.identity}>
          <AppIcon app={app} />
          <View style={styles.details}>
            <Text style={[styles.counterparty, { color: theme.text }]}>
              {row.counterparty || row.title || unknownLabel}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {appLabel(app ? [app] : [], row.source_app)} · {formatTime(row.posted_at, locale)}
            </Text>
            {row.status === 'needs_review' && (
              <Text style={[styles.meta, { color: theme.textSecondary }]}>{unknownLabel}</Text>
            )}
          </View>
        </View>
        <View style={styles.value}>
          <Text
            style={[
              styles.amount,
              !signed && styles.unparsed,
              { color: signed ? directionColor : theme.textSecondary },
            ]}
          >
            {amountLabel}
          </Text>
          {directionLabel ? (
            <Text style={[styles.direction, { color: directionColor }]}>{directionLabel}</Text>
          ) : null}
        </View>
      </Pressable>
      {signed && onFlip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={flipLabel}
          onPress={onFlip}
          style={({ pressed }) => [
            styles.flip,
            stacked && styles.flipStacked,
            { borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="swap-horizontal" size={24} color={theme.text} />
          {stacked && <Text style={[styles.flipLabel, { color: theme.text }]}>{flipLabel}</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  containerStacked: { flexDirection: 'column' },
  main: { flex: 1, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  mainStacked: { alignItems: 'flex-start', flexWrap: 'wrap' },
  identity: { flex: 1, flexBasis: 150, flexDirection: 'row', alignItems: 'center', gap: 12 },
  details: { flex: 1, gap: 3 },
  counterparty: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  meta: { fontSize: 12, lineHeight: 17 },
  value: { alignItems: 'flex-end', flexShrink: 1, gap: 2 },
  amount: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  unparsed: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  direction: { fontSize: 12, lineHeight: 17, fontWeight: '800', textTransform: 'uppercase' },
  flip: {
    width: 48,
    minHeight: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  flipStacked: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    borderLeftWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flipLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  fallbackIcon: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  fallbackIconText: { fontSize: 12, lineHeight: 17, fontWeight: '800' },
  pressed: { opacity: 0.65 },
});
