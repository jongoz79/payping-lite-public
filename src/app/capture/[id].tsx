import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppButton, AppInput, Icon, Screen } from '@/components/ui';
import {
  correctCapture,
  deleteCapture,
  getCaptureById,
  notifyCapturesChanged,
  updateCaptureNote,
  updateCaptureStatus,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Direction } from '@/parser/engine';
import { fallbackAppLabel } from '@/utils/apps';
import { formatAmount, formatTime } from '@/utils/format';

export default function CaptureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, t } = useI18n();
  const theme = useTheme();
  const [row] = useState(() => getCaptureById(id));
  const [direction, setDirection] = useState<Direction>(row?.direction ?? 'in');
  const [amount, setAmount] = useState(
    row?.amount_minor === null || row?.amount_minor === undefined ? '' : (row.amount_minor / 100).toFixed(2),
  );
  const [counterparty, setCounterparty] = useState(row?.counterparty ?? '');
  const [note, setNote] = useState(row?.user_note ?? '');

  if (!row) {
    return (
      <Screen title={t('capture.details')}>
        <Text style={{ color: theme.muted, fontSize: 16 }}>{t('noHistory')}</Text>
        <AppButton label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const parsedAmount = Number(amount);
  const previewAmount =
    amount.trim() === '' && row.amount_minor === null
      ? null
      : Number.isFinite(parsedAmount) && parsedAmount >= 0
        ? Math.round(parsedAmount * 100)
        : null;
  const amountColor = direction === 'in' ? theme.in : direction === 'out' ? theme.out : theme.muted;
  const locale = language === 'ms' ? 'ms-MY' : 'en-MY';

  function save() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert(t('errors.missingAmount'));
      return;
    }
    correctCapture(row!.id, {
      direction,
      amount_minor: Math.round(parsed * 100),
      counterparty: counterparty.trim() || null,
    });
    updateCaptureNote(row!.id, note.trim() || null);
    updateCaptureStatus(row!.id, 'logged');
    notifyCapturesChanged();
    router.back();
  }

  function remove() {
    Alert.alert(t('capture.deleteTitle'), t('capture.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('capture.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            if (deleteCapture(row!.id)) {
              notifyCapturesChanged();
              router.back();
            } else {
              Alert.alert(t('errors.generic'));
            }
          } catch {
            Alert.alert(t('errors.generic'));
          }
        },
      },
    ]);
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.back')}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Icon name="arrow-left" size={24} color={theme.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>
          {t('capture.edit')}
        </Text>
      </View>

      <View style={styles.metadata}>
        <Icon name="application-outline" size={22} color={theme.muted} />
        <Text style={[styles.appName, { color: theme.ink }]}>{fallbackAppLabel(row.source_app)}</Text>
        <Text style={[styles.time, { color: theme.muted }]}>{formatTime(row.posted_at, locale)}</Text>
      </View>

      <View style={styles.paymentSummary}>
        <Text
          style={[
            previewAmount === null ? styles.amountMissing : styles.amount,
            { color: previewAmount === null ? theme.muted : amountColor },
          ]}
        >
          {previewAmount === null
            ? t('capture.noAmount')
            : formatAmount(previewAmount, row.currency, direction)}
        </Text>
        <Text style={[styles.payee, { color: theme.ink }]}>
          {counterparty.trim() || row.title || t('common.unknown')}
        </Text>
      </View>

      <View style={styles.directionGroup}>
        <Text style={[styles.label, { color: theme.ink }]}>{t('capture.direction')}</Text>
        <View style={[styles.directions, { backgroundColor: theme.subtle, borderColor: theme.line }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: direction === 'in' }}
            onPress={() => setDirection('in')}
            style={({ pressed }) => [
              styles.direction,
              direction === 'in' && { backgroundColor: theme.surface, borderColor: theme.line },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="plus" size={20} color={direction === 'in' ? theme.ink : theme.muted} />
            <Text style={[styles.directionLabel, { color: direction === 'in' ? theme.ink : theme.muted }]}>
              {t('announcement.moneyIn')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: direction === 'out' }}
            onPress={() => setDirection('out')}
            style={({ pressed }) => [
              styles.direction,
              direction === 'out' && { backgroundColor: theme.surface, borderColor: theme.line },
              pressed && styles.pressed,
            ]}
          >
            <Icon name="minus" size={20} color={direction === 'out' ? theme.ink : theme.muted} />
            <Text style={[styles.directionLabel, { color: direction === 'out' ? theme.ink : theme.muted }]}>
              {t('announcement.moneyOut')}
            </Text>
          </Pressable>
        </View>
      </View>

      <AppInput
        label={t('capture.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <AppInput label={t('capture.counterparty')} value={counterparty} onChangeText={setCounterparty} />
      <AppInput label={t('capture.note')} value={note} onChangeText={setNote} multiline />

      <AppButton label={t('capture.saveChanges')} icon="check" variant="primary" onPress={save} />

      <View style={styles.rawSection}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.muted }]}>
          {t('history.rawNotification')}
        </Text>
        <View style={[styles.raw, { backgroundColor: theme.subtle, borderColor: theme.line }]}>
          {row.title ? <Text style={[styles.rawTitle, { color: theme.ink }]}>{row.title}</Text> : null}
          <Text selectable style={[styles.rawBody, { color: theme.muted }]}>
            {row.body}
          </Text>
        </View>
      </View>

      {!row.parser_id && (
        <AppButton
          label={t('createParserFromThis')}
          icon="school-outline"
          variant="accent"
          onPress={() => router.push({ pathname: '/parser-create', params: { captureId: row.id } })}
        />
      )}

      <AppButton label={t('capture.delete')} icon="delete-outline" variant="danger" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 0, gap: 20 },
  header: {
    minHeight: 60,
    paddingVertical: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    flexBasis: 160,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.24,
  },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  appName: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  time: { marginLeft: 'auto', fontSize: 12, lineHeight: 17 },
  paymentSummary: { gap: 4 },
  amount: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  amountMissing: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  payee: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  directionGroup: { gap: 8 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  directions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
    borderWidth: 1,
    borderRadius: 16,
  },
  direction: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 120,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  directionLabel: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  rawSection: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  raw: { padding: 16, borderWidth: 1, borderRadius: 16, gap: 8 },
  rawTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  rawBody: { fontSize: 14, lineHeight: 20, fontFamily: 'monospace' },
  pressed: { opacity: 0.7 },
});
