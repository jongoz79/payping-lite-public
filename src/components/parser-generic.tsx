import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { ParserErrors } from '@/components/parser-shared';
import { AppButton, AppInput, Chip, Section } from '@/components/ui';
import {
  getDefaultGenericConfig,
  getGenericConfig,
  resetGenericConfig as resetStoredGenericConfig,
  saveGenericConfig,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { GenericConfig } from '@/parser/engine';
import { validateGeneric } from '@/parser/validate';

export function ParserGenericEditor() {
  const { t } = useI18n();
  const theme = useTheme();
  const [config, setConfig] = useState<GenericConfig>(() => {
    try {
      return getGenericConfig();
    } catch {
      return getDefaultGenericConfig();
    }
  });
  const [raw, setRaw] = useState(() => JSON.stringify(config, null, 2));
  const [mode, setMode] = useState<'form' | 'raw'>('form');
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const update = (next: GenericConfig) => {
    setConfig(next);
    setRaw(JSON.stringify(next, null, 2));
    setErrors([]);
    setErrorTitle(null);
  };

  const changeMode = (next: 'form' | 'raw') => {
    if (next === 'form' && mode === 'raw') {
      try {
        const result = validateGeneric(JSON.parse(raw));
        if (!result.ok) {
          setErrorTitle(t('errors.invalidParser'));
          setErrors(result.errors.map((error) => error.message));
          return;
        }
        update(result.generic);
      } catch {
        setErrorTitle(t('errors.invalidJson'));
        setErrors([]);
        return;
      }
    }
    setMode(next);
  };

  const save = () => {
    let candidate: unknown = config;
    if (mode === 'raw') {
      try {
        candidate = JSON.parse(raw);
      } catch {
        setErrorTitle(t('errors.invalidJson'));
        setErrors([]);
        return;
      }
    }
    const result = validateGeneric(candidate);
    if (!result.ok) {
      setErrorTitle(t('errors.invalidParser'));
      setErrors(result.errors.map((error) => error.message));
      return;
    }
    try {
      saveGenericConfig(result.generic);
      update(result.generic);
      setErrorTitle(null);
    } catch {
      setErrorTitle(t('errors.saveFailed'));
      setErrors([]);
    }
  };

  const reset = () => {
    Alert.alert(t('parsers.resetDefaultTitle'), t('parsers.resetDefaultBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          try {
            resetStoredGenericConfig();
            update(getDefaultGenericConfig());
          } catch {
            setErrorTitle(t('errors.resetFailed'));
          }
        },
      },
    ]);
  };

  return (
    <Section title={t('parsers.generic')}>
      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {t('parsers.genericDescription')}
        </Text>
        <View style={styles.mode}>
          <Chip
            label={t('parsers.visualEditor')}
            selected={mode === 'form'}
            onPress={() => changeMode('form')}
          />
          <Chip label={t('parsers.rawEditor')} selected={mode === 'raw'} onPress={() => changeMode('raw')} />
        </View>
        <ParserErrors title={errorTitle ?? undefined} errors={errors} />
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
            style={styles.raw}
          />
        ) : (
          <>
            <AppInput
              label={t('parsers.creditKeywords')}
              value={config.creditKeywords.join('\n')}
              onChangeText={(value) => update({ ...config, creditKeywords: lines(value) })}
              multiline
              scrollEnabled={false}
            />
            <AppInput
              label={t('parsers.debitKeywords')}
              value={config.debitKeywords.join('\n')}
              onChangeText={(value) => update({ ...config, debitKeywords: lines(value) })}
              multiline
              scrollEnabled={false}
            />
            <AppInput
              label={t('parsers.amountPatterns')}
              value={config.amountPatterns.join('\n')}
              onChangeText={(value) => update({ ...config, amountPatterns: lines(value) })}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppInput
              label={`${t('parsers.counterpartyPattern')} · ${t('received')}`}
              value={config.counterpartyPatterns.in.join('\n')}
              onChangeText={(value) =>
                update({
                  ...config,
                  counterpartyPatterns: {
                    ...config.counterpartyPatterns,
                    in: lines(value),
                  },
                })
              }
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppInput
              label={`${t('parsers.counterpartyPattern')} · ${t('paid')}`}
              value={config.counterpartyPatterns.out.join('\n')}
              onChangeText={(value) =>
                update({
                  ...config,
                  counterpartyPatterns: {
                    ...config.counterpartyPatterns,
                    out: lines(value),
                  },
                })
              }
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppInput
              label={t('today.reference', { reference: '' })}
              value={config.referencePatterns.join('\n')}
              onChangeText={(value) => update({ ...config, referencePatterns: lines(value) })}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}
        <View style={styles.actions}>
          <AppButton label={t('common.save')} variant="primary" onPress={save} />
          <AppButton label={t('parsers.resetDefault')} variant="text" onPress={reset} />
        </View>
      </View>
    </Section>
  );
}

function lines(value: string): string[] {
  return value.split('\n').filter((line) => line.length > 0);
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  description: { fontSize: 16, lineHeight: 23 },
  mode: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  raw: { minHeight: 360 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
