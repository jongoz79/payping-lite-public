import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ParserErrors } from '@/components/parser-shared';
import { AppButton, AppInput } from '@/components/ui';
import { saveParser } from '@/db';
import type { ParserSource } from '@/db';
import { useI18n } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import type { Parser } from '@/parser/engine';
import { validateParser } from '@/parser/validate';

export type ParserImportOutcome =
  | { status: 'success'; parser: Parser }
  | { status: 'cancelled' }
  | { status: 'error'; title: TranslationKey; errors: string[] };

export function importParserJson(text: string, source: ParserSource): ParserImportOutcome {
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    return { status: 'error', title: 'errors.invalidJson', errors: [] };
  }

  const result = validateParser(candidate);
  if (!result.ok) {
    return {
      status: 'error',
      title: 'errors.invalidParser',
      errors: result.errors.map((error) => error.message),
    };
  }

  try {
    saveParser({
      id: result.parser.id,
      json: JSON.stringify(result.parser),
      source,
    });
    return { status: 'success', parser: result.parser };
  } catch {
    return { status: 'error', title: 'errors.importFailed', errors: [] };
  }
}

export async function importParserDocument(): Promise<ParserImportOutcome> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return { status: 'cancelled' };
    const asset = result.assets[0];
    if (!asset) return { status: 'error', title: 'errors.fileRead', errors: [] };
    const text = await new File(asset.uri).text();
    return importParserJson(text, 'file');
  } catch {
    return { status: 'error', title: 'errors.fileRead', errors: [] };
  }
}

export function ParserImportPanel({ onImported }: { onImported?: (parser: Parser) => void }) {
  const { t } = useI18n();
  const [json, setJson] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [errorTitle, setErrorTitle] = useState<TranslationKey | null>(null);

  const importJson = () => {
    const outcome = importParserJson(json, 'pasted');
    if (outcome.status === 'success') {
      setJson('');
      setErrors([]);
      setErrorTitle(null);
      onImported?.(outcome.parser);
      return;
    }
    if (outcome.status === 'error') {
      setErrorTitle(outcome.title);
      setErrors(outcome.errors);
    }
  };

  return (
    <View style={styles.content}>
      <AppInput
        label={t('parsers.pasteJson')}
        value={json}
        onChangeText={(value) => {
          setJson(value);
          setErrors([]);
          setErrorTitle(null);
        }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ParserErrors title={errorTitle ? t(errorTitle) : undefined} errors={errors} />
      <AppButton
        label={t('parsers.import')}
        testID="parser-import-submit"
        icon="import"
        variant="primary"
        disabled={!json.trim()}
        onPress={importJson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
});
