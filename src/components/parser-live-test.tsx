import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppButton, EmptyState, Icon, Section } from '@/components/ui';
import type { CaptureRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { parsePreview } from '@/native/capture';
import type { CaptureParseResult } from '@/native/capture';
import { formatAmount } from '@/utils/format';

export function ParserLiveTest({ parserJson, captures }: { parserJson: string; captures: CaptureRow[] }) {
  const { t } = useI18n();
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(captures[0]?.id ?? null);
  const selected = captures.find((capture) => capture.id === selectedId) ?? captures[0];
  const result = useMemo<CaptureParseResult | null>(() => {
    if (!selected) return null;
    try {
      return parsePreview(selected.title, selected.body, selected.source_app, parserJson);
    } catch {
      return null;
    }
  }, [parserJson, selected]);

  return (
    <Section title={t('parsers.liveTest')}>
      <View style={styles.content}>
        {captures.length === 0 ? (
          <EmptyState
            icon="flask-outline"
            title={t('parsers.liveTest')}
            body={t('parsers.testPlaceholder')}
          />
        ) : (
          <>
            <View style={styles.captures}>
              {captures.slice(0, 12).map((capture) => (
                <AppButton
                  key={capture.id}
                  label={capture.title || capture.source_app}
                  variant={selected?.id === capture.id ? 'primary' : 'secondary'}
                  onPress={() => setSelectedId(capture.id)}
                />
              ))}
            </View>
            {selected && (
              <Text selectable style={[styles.notification, { color: theme.textSecondary }]}>
                {selected.body}
              </Text>
            )}
            <View style={styles.resultRow}>
              <Icon
                name={result?.ruleId ? 'check-circle' : 'close-circle-outline'}
                size={18}
                color={result?.ruleId ? theme.moneyIn : theme.textSecondary}
              />
              <Text
                style={[
                  styles.result,
                  {
                    color: result?.ruleId ? theme.moneyIn : theme.textSecondary,
                  },
                ]}
              >
                {t(result?.ruleId ? 'parsers.testSuccess' : 'parsers.testFailure')}
              </Text>
            </View>
            {result?.ruleId && (
              <View style={styles.resultDetails}>
                <Text selectable style={[styles.metadata, { color: theme.text }]}>
                  {result.ruleId}
                </Text>
                <Text style={[styles.metadata, { color: theme.text }]}>
                  {result.direction === 'in'
                    ? t('received')
                    : result.direction === 'out'
                      ? t('paid')
                      : result.direction}{' '}
                  {formatAmount(result.amountMinor, result.currency, result.direction)}
                </Text>
                {result.counterparty && (
                  <Text style={[styles.metadata, { color: theme.text }]}>{result.counterparty}</Text>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  captures: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notification: { fontSize: 16, lineHeight: 23, fontFamily: 'monospace' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  result: { flexShrink: 1, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  resultDetails: { gap: 4 },
  metadata: { fontSize: 16, lineHeight: 22 },
});
