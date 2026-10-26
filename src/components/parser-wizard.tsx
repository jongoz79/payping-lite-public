import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { ParserErrors, confirmReparse } from '@/components/parser-shared';
import { AppButton, AppInput, Chip, Icon } from '@/components/ui';
import type { CaptureRow } from '@/db';
import { saveParser } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { parsePreview } from '@/native/capture';
import type { CaptureParseResult } from '@/native/capture';
import type { Parser } from '@/parser/engine';
import { validateParser } from '@/parser/validate';
import {
  createParserFromNotification,
  tokenizeNotification,
  type TextSelection,
} from '@/utils/parser-wizard';
import { fallbackAppLabel } from '@/utils/apps';
import { formatAmount } from '@/utils/format';

type Field = 'amount' | 'counterparty';

export function ParserWizard({
  capture,
  appName,
  onSaved,
}: {
  capture: CaptureRow;
  appName?: string;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const titleTokens = useMemo(() => tokenizeNotification(capture.title), [capture.title]);
  const bodyTokens = useMemo(() => tokenizeNotification(capture.body), [capture.body]);
  const [direction, setDirection] = useState<'in' | 'out'>(capture.direction === 'out' ? 'out' : 'in');
  const [activeField, setActiveField] = useState<Field>('amount');
  const [amount, setAmount] = useState<TextSelection | null>(null);
  const [counterparty, setCounterparty] = useState<TextSelection | null>(null);
  const [name, setName] = useState(() => appName ?? fallbackAppLabel(capture.source_app));
  const [errorTitle, setErrorTitle] = useState<string | null>(null);

  const generated = useMemo<{ parser: Parser | null; errors: string[] }>(() => {
    if (!amount) return { parser: null, errors: [] };
    try {
      return {
        parser: createParserFromNotification({
          notification: {
            platform: capture.platform,
            sourceApp: capture.source_app,
            title: capture.title,
            body: capture.body,
          },
          direction,
          amount,
          counterparty: counterparty ?? undefined,
          name,
        }),
        errors: [],
      };
    } catch (error) {
      return {
        parser: null,
        errors: [error instanceof Error ? error.message : t('errors.generic')],
      };
    }
  }, [amount, capture, counterparty, direction, name, t]);

  const preview = useMemo<CaptureParseResult | null>(() => {
    if (!generated.parser) return null;
    try {
      return parsePreview(capture.title, capture.body, capture.source_app, JSON.stringify(generated.parser));
    } catch {
      return null;
    }
  }, [capture, generated.parser]);

  const selectToken = (selection: TextSelection) => {
    setErrorTitle(null);
    if (activeField === 'amount') {
      setAmount((current) => (sameSelection(current, selection) ? null : selection));
      setActiveField('counterparty');
      return;
    }
    setCounterparty((current) => {
      if (!current) return selection;
      if ((current.source ?? 'body') !== (selection.source ?? 'body')) return selection;
      if (selection.start >= current.start && selection.end <= current.end) return null;
      return {
        start: Math.min(current.start, selection.start),
        end: Math.max(current.end, selection.end),
        source: current.source,
      };
    });
  };

  const save = () => {
    if (!amount) {
      setErrorTitle(t('errors.missingAmount'));
      return;
    }
    if (!generated.parser) {
      setErrorTitle(t('errors.generic'));
      return;
    }
    const result = validateParser(generated.parser);
    if (!result.ok) {
      setErrorTitle(result.errors.map((error) => error.message).join('\n'));
      return;
    }
    try {
      saveParser({
        id: result.parser.id,
        json: JSON.stringify(result.parser),
        source: 'created',
      });
      confirmReparse(result.parser, t, onSaved);
    } catch {
      setErrorTitle(t('errors.saveFailed'));
    }
  };

  return (
    <>
      <Text style={[styles.intro, { color: theme.textSecondary }]}>{t('parsers.wizardIntro')}</Text>
      <ParserErrors title={errorTitle ?? undefined} errors={generated.errors} />

      <WizardStep number={1} title={t('parsers.name')}>
        <AppInput label={t('parsers.name')} value={name} onChangeText={setName} />
      </WizardStep>

      <WizardStep number={2} title={t('capture.direction')}>
        <View style={styles.choices}>
          <Chip label={t('received')} selected={direction === 'in'} onPress={() => setDirection('in')} />
          <Chip label={t('paid')} selected={direction === 'out'} onPress={() => setDirection('out')} />
        </View>
      </WizardStep>

      <WizardStep number={3} title={t('history.rawNotification')}>
        <View style={styles.choices}>
          <Chip
            label={t('parsers.amountField')}
            selected={activeField === 'amount'}
            onPress={() => setActiveField('amount')}
          />
          <Chip
            label={t('parsers.counterpartyField')}
            selected={activeField === 'counterparty'}
            onPress={() => setActiveField('counterparty')}
          />
        </View>
        <Text style={[styles.instruction, { color: theme.text }]}>
          {activeField === 'amount'
            ? t('parsers.tagAmount', { field: t('parsers.amountField') })
            : t('parsers.tagCounterparty', {
                field: t('parsers.counterpartyField'),
              })}
        </Text>
        {[
          {
            field: 'title' as const,
            tokens: titleTokens,
            label: t('parsers.notificationTitle'),
          },
          {
            field: 'body' as const,
            tokens: bodyTokens,
            label: t('parsers.notificationBody'),
          },
        ]
          .filter((group) => group.tokens.length > 0)
          .map((group) => (
            <View
              key={group.field}
              style={[
                styles.notification,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.tokenGroupLabel, { color: theme.textSecondary }]}>{group.label}</Text>
              <Text style={[styles.sentence, { color: theme.text }]}>
                {groupSelectedTokens(group.tokens, amount, counterparty, group.field).map(
                  (tokenGroup, index) => {
                    const firstToken = tokenGroup.tokens[0];
                    const lastToken = tokenGroup.tokens[tokenGroup.tokens.length - 1];
                    const text = tokenGroup.tokens.map((token) => token.text).join(' ');
                    const selected = tokenGroup.field !== null;
                    const selectedField =
                      tokenGroup.field === 'amount'
                        ? t('parsers.amountField')
                        : tokenGroup.field === 'counterparty'
                          ? t('parsers.counterpartyField')
                          : null;
                    return (
                      <Fragment key={`${firstToken.start}-${lastToken.end}`}>
                        {index > 0 && ' '}
                        <Pressable
                          accessibilityRole="button"
                          testID={
                            group.field === 'body'
                              ? activeField === 'amount'
                                ? 'wizard-token-amount'
                                : 'wizard-token-counterparty'
                              : undefined
                          }
                          accessibilityLabel={selectedField ? `${text}, ${selectedField}` : text}
                          accessibilityState={{ selected }}
                          onPress={() =>
                            selectToken({
                              start: firstToken.start,
                              end: lastToken.end,
                              source: group.field,
                            })
                          }
                          style={[
                            styles.token,
                            {
                              backgroundColor: selected ? theme.accentPrimary : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={[styles.tokenText, { color: selected ? theme.accentInk : theme.text }]}
                          >
                            {text}
                            {selectedField && <Text style={styles.tokenBadge}> · {selectedField}</Text>}
                          </Text>
                        </Pressable>
                      </Fragment>
                    );
                  },
                )}
              </Text>
            </View>
          ))}
      </WizardStep>

      <WizardStep number={4} title={t('parsers.preview')}>
        <View
          style={[
            styles.preview,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.previewStatusRow}>
            <Icon
              name={preview?.ruleId ? 'check-circle' : 'close-circle-outline'}
              size={18}
              color={preview?.ruleId ? theme.moneyIn : theme.textSecondary}
            />
            <Text
              style={[
                styles.previewStatus,
                {
                  color: preview?.ruleId ? theme.moneyIn : theme.textSecondary,
                },
              ]}
            >
              {t(preview?.ruleId ? 'parsers.testSuccess' : 'parsers.testFailure')}
            </Text>
          </View>
          {preview?.ruleId && (
            <>
              <Text style={[styles.previewText, { color: theme.text }]}>{preview.ruleId}</Text>
              <Text style={[styles.previewText, { color: theme.text }]}>
                {preview.direction === 'in' ? t('received') : t('paid')}{' '}
                {formatAmount(preview.amountMinor, preview.currency, preview.direction)}
              </Text>
              {preview.counterparty && (
                <Text style={[styles.previewText, { color: theme.text }]}>{preview.counterparty}</Text>
              )}
            </>
          )}
        </View>
        <AppButton
          label={t('parsers.saveAndTest')}
          icon="content-save-outline"
          variant="accent"
          onPress={save}
        />
      </WizardStep>
    </>
  );
}

function WizardStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.stepNumberText, { color: theme.text }]}>{number}</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.stepTitle, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      <View style={styles.stepContent}>{children}</View>
    </View>
  );
}

function groupSelectedTokens(
  tokens: ReturnType<typeof tokenizeNotification>,
  amount: TextSelection | null,
  counterparty: TextSelection | null,
  source: 'body' | 'title',
): { tokens: ReturnType<typeof tokenizeNotification>; field: Field | null }[] {
  const groups: {
    tokens: ReturnType<typeof tokenizeNotification>;
    field: Field | null;
  }[] = [];
  for (const token of tokens) {
    const field = contains(amount, token, source)
      ? 'amount'
      : contains(counterparty, token, source)
        ? 'counterparty'
        : null;
    const current = groups.at(-1);
    if (field !== null && current?.field === field) {
      current.tokens.push(token);
    } else {
      groups.push({ tokens: [token], field });
    }
  }
  return groups;
}

function sameSelection(a: TextSelection | null, b: TextSelection): boolean {
  return a?.start === b.start && a.end === b.end && (a.source ?? 'body') === (b.source ?? 'body');
}

function contains(
  selection: TextSelection | null,
  token: { start: number; end: number },
  source: 'body' | 'title',
): boolean {
  return Boolean(
    selection &&
    (selection.source ?? 'body') === source &&
    token.start >= selection.start &&
    token.end <= selection.end,
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 16, lineHeight: 23 },
  step: { gap: 12 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  stepTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
  },
  stepContent: { gap: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  instruction: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  notification: { padding: 12, gap: 8, borderWidth: 1, borderRadius: 12 },
  tokenGroupLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  sentence: { fontSize: 16, lineHeight: 30, fontFamily: 'monospace' },
  token: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 5,
    justifyContent: 'center',
  },
  tokenText: { fontSize: 16, lineHeight: 24, fontFamily: 'monospace' },
  tokenBadge: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  preview: { padding: 16, gap: 8, borderWidth: 1, borderRadius: 12 },
  previewStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  previewStatus: {
    flex: 1,
    flexBasis: 160,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  previewText: { fontSize: 16, lineHeight: 22 },
});
