import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { ParserLiveTest } from '@/components/parser-live-test';
import { ParserErrors, confirmReparse, parserApps, shareParser } from '@/components/parser-shared';
import { AppButton, AppInput, Chip, Section } from '@/components/ui';
import { deleteParser, saveParser } from '@/db';
import type { CaptureRow, ParserRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Parser, ParserRule } from '@/parser/engine';
import { validateParser } from '@/parser/validate';

type EditorMode = 'form' | 'raw';

export function ParserEditor({
  row,
  captures,
  onSaved,
  onDeleted,
}: {
  row: ParserRow;
  captures: CaptureRow[];
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const { t } = useI18n();
  const theme = useTheme();
  const [parser, setParser] = useState<Parser>(() => JSON.parse(row.json) as Parser);
  const [raw, setRaw] = useState(() => JSON.stringify(JSON.parse(row.json), null, 2));
  const [mode, setMode] = useState<EditorMode>('form');
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const recentCaptures = useMemo(() => {
    const apps = new Set(parserApps(parser));
    return captures.filter((capture) => apps.has(capture.source_app)).slice(0, 30);
  }, [captures, parser]);

  const updateParser = (next: Parser) => {
    setParser(next);
    setRaw(JSON.stringify(next, null, 2));
    setErrors([]);
    setErrorTitle(null);
  };

  const updateRule = (index: number, next: ParserRule) => {
    updateParser({
      ...parser,
      rules: parser.rules.map((rule, i) => (i === index ? next : rule)),
    });
  };

  const changeMode = (next: EditorMode) => {
    if (next === mode) return;
    if (next === 'form') {
      try {
        const result = validateParser(JSON.parse(raw));
        if (!result.ok) {
          setErrorTitle(t('errors.invalidParser'));
          setErrors(result.errors.map((error) => error.message));
          return;
        }
        setParser(result.parser);
        setRaw(JSON.stringify(result.parser, null, 2));
      } catch {
        setErrorTitle(t('errors.invalidJson'));
        setErrors([]);
        return;
      }
    }
    setErrors([]);
    setErrorTitle(null);
    setMode(next);
  };

  const validatedParser = (): Parser | null => {
    let candidate: unknown = parser;
    if (mode === 'raw') {
      try {
        candidate = JSON.parse(raw);
      } catch {
        setErrorTitle(t('errors.invalidJson'));
        setErrors([]);
        return null;
      }
    }
    const result = validateParser(candidate);
    if (!result.ok) {
      setErrorTitle(t('errors.invalidParser'));
      setErrors(result.errors.map((error) => error.message));
      return null;
    }
    setErrors([]);
    setErrorTitle(null);
    return result.parser;
  };

  const save = () => {
    const validated = validatedParser();
    if (!validated) return;
    try {
      saveParser({
        id: validated.id,
        json: JSON.stringify(validated),
        source: row.source,
        enabled: row.enabled === 1,
      });
      if (validated.id !== row.id) deleteParser(row.id);
      updateParser(validated);
      confirmReparse(validated, t, onSaved);
    } catch {
      setErrorTitle(t('errors.saveFailed'));
      setErrors([]);
    }
  };

  const share = async () => {
    const validated = validatedParser();
    if (!validated) return;
    try {
      await shareParser(validated);
    } catch {
      setErrorTitle(t('errors.generic'));
    }
  };

  const remove = () => {
    Alert.alert(t('common.delete'), parser.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            deleteParser(row.id);
            onDeleted?.();
          } catch {
            setErrorTitle(t('errors.saveFailed'));
          }
        },
      },
    ]);
  };

  const currentJson = mode === 'raw' ? raw : JSON.stringify(parser);

  return (
    <>
      <ParserErrors title={errorTitle ?? undefined} errors={errors} />
      <View style={styles.mode}>
        <Chip
          label={t('parsers.visualEditor')}
          selected={mode === 'form'}
          onPress={() => changeMode('form')}
        />
        <Chip label={t('parsers.rawEditor')} selected={mode === 'raw'} onPress={() => changeMode('raw')} />
      </View>

      {mode === 'raw' ? (
        <AppInput
          label={t('parsers.rawEditor')}
          value={raw}
          onChangeText={(value) => {
            setRaw(value);
            setErrors([]);
            setErrorTitle(null);
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.rawInput}
        />
      ) : (
        <>
          <Section title={t('parsers.editor')}>
            <View style={styles.content}>
              <AppInput
                label={t('parsers.name')}
                value={parser.name}
                onChangeText={(name) => updateParser({ ...parser, name })}
              />
              <AppInput
                label={t('parsers.author')}
                value={parser.author ?? ''}
                onChangeText={(author) => updateParser({ ...parser, author: author || undefined })}
              />
              <AppInput
                label={t('parsers.packageNames')}
                value={parser.androidPackages.join('\n')}
                onChangeText={(value) => updateParser({ ...parser, androidPackages: lines(value) })}
                multiline
                autoCapitalize="none"
              />
              <AppInput
                label={t('parsers.iosAppNames')}
                value={parser.iosAppNames.join('\n')}
                onChangeText={(value) => updateParser({ ...parser, iosAppNames: lines(value) })}
                multiline
                autoCapitalize="none"
              />
            </View>
          </Section>

          {parser.rules.map((rule, index) => (
            <Section key={`${index}-${rule.id}`} title={t('parsers.rule', { number: index + 1 })}>
              <View style={styles.content}>
                <Text selectable style={[styles.ruleId, { color: theme.textSecondary }]}>
                  {rule.id}
                </Text>
                <View style={styles.directions}>
                  {(['in', 'out', 'info'] as const).map((direction) => (
                    <Chip
                      key={direction}
                      label={direction === 'in' ? t('received') : direction === 'out' ? t('paid') : direction}
                      selected={rule.direction === direction}
                      onPress={() => updateRule(index, { ...rule, direction })}
                    />
                  ))}
                </View>
                <AppInput
                  label={t('parsers.titlePattern')}
                  value={rule.match.title ?? ''}
                  onChangeText={(value) =>
                    updateRule(index, {
                      ...rule,
                      match: { ...rule.match, title: value || undefined },
                    })
                  }
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppInput
                  label={t('parsers.bodyPattern')}
                  value={rule.match.body ?? ''}
                  onChangeText={(value) =>
                    updateRule(index, {
                      ...rule,
                      match: { ...rule.match, body: value || undefined },
                    })
                  }
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppInput
                  label={t('parsers.amountPattern')}
                  value={extractionText(rule, 'amount')}
                  onChangeText={(value) => updateRule(index, extraction(rule, 'amount', value))}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppInput
                  label={t('parsers.counterpartyPattern')}
                  value={extractionText(rule, 'counterparty')}
                  onChangeText={(value) => updateRule(index, extraction(rule, 'counterparty', value))}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppButton
                  label={t('parsers.deleteRule')}
                  icon="delete-outline"
                  variant="text"
                  disabled={parser.rules.length === 1}
                  onPress={() =>
                    updateParser({
                      ...parser,
                      rules: parser.rules.filter((_, ruleIndex) => ruleIndex !== index),
                    })
                  }
                />
              </View>
            </Section>
          ))}
          <AppButton
            label={t('parsers.addRule')}
            icon="plus"
            onPress={() => {
              const number = parser.rules.length + 1;
              updateParser({
                ...parser,
                rules: [
                  ...parser.rules,
                  {
                    id: `${parser.id}.rule${number}.v1`,
                    priority: 100,
                    match: { body: '' },
                    direction: 'in',
                    extract: { amount: '' },
                  },
                ],
              });
            }}
          />
        </>
      )}

      <ParserLiveTest parserJson={currentJson} captures={recentCaptures} />
      <View style={styles.actions}>
        <AppButton label={t('common.save')} icon="content-save-outline" variant="primary" onPress={save} />
        <AppButton label={t('parsers.shareJson')} icon="share-variant-outline" onPress={() => void share()} />
        <AppButton
          label={t('parsers.reparse')}
          icon="history"
          onPress={() => {
            const validated = validatedParser();
            if (validated) confirmReparse(validated, t);
          }}
        />
        <AppButton label={t('common.delete')} icon="delete-outline" variant="danger" onPress={remove} />
      </View>
    </>
  );
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractionText(rule: ParserRule, field: 'amount' | 'counterparty'): string {
  const value = rule.extract?.[field];
  return typeof value === 'string' ? value : (value?.pattern ?? '');
}

function extraction(rule: ParserRule, field: 'amount' | 'counterparty', value: string): ParserRule {
  const current = rule.extract?.[field];
  const next = value ? (typeof current === 'object' ? { ...current, pattern: value } : value) : undefined;
  return { ...rule, extract: { ...rule.extract, [field]: next } };
}

const styles = StyleSheet.create({
  mode: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { padding: 16, gap: 12 },
  rawInput: { minHeight: 420 },
  ruleId: { fontSize: 16, lineHeight: 22, fontFamily: 'monospace' },
  directions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
