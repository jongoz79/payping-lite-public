import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppIcon } from '@/components/capture-row';
import { AppButton, Icon } from '@/components/ui';
import type { CaptureRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { InstalledApp } from '@/native/capture';
import { formatAmount } from '@/utils/format';

export function ReviewCard({
  row,
  app,
  onReview,
  onEdit,
  onCreateParser,
}: {
  row: CaptureRow;
  app?: InstalledApp;
  onReview: (direction: 'in' | 'out' | 'ignored') => void;
  onEdit: () => void;
  onCreateParser: () => void;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const signed = row.amount_minor !== null && (row.direction === 'in' || row.direction === 'out');

  function openMenu() {
    Alert.alert(t('a11y.reviewOptions'), undefined, [
      { text: t('edit'), onPress: onEdit },
      { text: t('createParserFromThis'), onPress: onCreateParser },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.summary}>
        <AppIcon app={app} size={36} />
        <View style={styles.summaryFields}>
          <Text style={[styles.name, { color: theme.text }]}>{row.counterparty || row.title}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>{app?.label ?? row.source_app}</Text>
        </View>
        <Text
          style={[
            styles.amount,
            !signed && styles.unparsed,
            {
              color: signed ? (row.direction === 'in' ? theme.moneyIn : theme.moneyOut) : theme.textSecondary,
            },
          ]}
        >
          {signed ? formatAmount(row.amount_minor, row.currency, row.direction) : t('capture.noAmount')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.reviewOptions')}
          onPress={openMenu}
          style={styles.menuButton}
        >
          <Icon name="dots-vertical" />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((value) => !value)}
        style={styles.rawButton}
      >
        <Text numberOfLines={expanded ? undefined : 2} style={[styles.raw, { color: theme.textSecondary }]}>
          {row.body}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {signed ? (
          <>
            <AppButton
              label={t('common.confirm')}
              onPress={() => onReview(row.direction === 'in' ? 'in' : 'out')}
              style={styles.action}
            />
            <AppButton
              label={row.direction === 'in' ? t('review.flipOut') : t('review.flipIn')}
              onPress={() => onReview(row.direction === 'in' ? 'out' : 'in')}
              style={styles.action}
            />
          </>
        ) : (
          <>
            <AppButton label={t('received')} onPress={() => onReview('in')} style={styles.action} />
            <AppButton label={t('paid')} onPress={() => onReview('out')} style={styles.action} />
          </>
        )}
        {!row.parser_id && (
          <AppButton
            label={t('createParserFromThis')}
            variant="accent"
            onPress={onCreateParser}
            style={styles.action}
          />
        )}
        <AppButton label={t('review.fix')} onPress={onEdit} style={styles.action} />
        <AppButton label={t('ignore')} onPress={() => onReview('ignored')} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  summary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  summaryFields: { flex: 1, flexBasis: 130, gap: 2 },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  meta: { fontSize: 12, lineHeight: 17 },
  amount: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  unparsed: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  menuButton: { width: 48, height: 48, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  rawButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 6 },
  raw: { fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1 },
});
