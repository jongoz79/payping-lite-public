import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppPicker } from '@/components/app-picker';
import { AppText as Text } from '@/components/app-text';
import { AppButton, AppInput, Screen, Section } from '@/components/ui';
import { getCaptures, saveParser, useCaptureRefresh, type CaptureRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  getPermissionStatus,
  isListenerConnected,
  openNotificationAccessSettings,
  speakTest,
} from '@/native/capture';
import { validateParser } from '@/parser/validate';

export default function DevCapture() {
  const { t } = useI18n();
  const theme = useTheme();
  const [rows, setRows] = useState<CaptureRow[]>([]);
  const [json, setJson] = useState('');
  const [status, setStatus] = useState('');
  const refresh = useCallback(() => {
    setRows(getCaptures({ limit: 20 }));
    setStatus(`${getPermissionStatus()} · ${isListenerConnected() ? t('settings.active') : t('common.off')}`);
  }, [t]);
  useCaptureRefresh(refresh);

  function importParser() {
    try {
      const result = validateParser(JSON.parse(json));
      if (!result.ok) {
        Alert.alert(t('errors.invalidParser'), result.errors.map((error) => error.message).join('\n'));
        return;
      }
      saveParser({
        id: result.parser.id,
        json: JSON.stringify(result.parser),
        source: 'pasted',
      });
      setJson('');
      Alert.alert(t('common.done'));
    } catch {
      Alert.alert(t('errors.invalidJson'));
    }
  }

  return (
    <Screen
      title="PayPing Lite"
      action={<AppButton variant="text" label={t('common.back')} onPress={() => router.back()} />}
    >
      <Section title={t('settings.listenerStatus')}>
        <View style={styles.padded}>
          <Text style={[styles.body, { color: theme.text }]}>{status}</Text>
          <AppButton label={t('onboarding.enableNotifications')} onPress={openNotificationAccessSettings} />
          <AppButton
            label={t('settings.testVoice')}
            onPress={() => speakTest('Plus 12 ringgit 50 sen, TNG eWallet, Ali')}
          />
        </View>
      </Section>
      <Section title={t('appPicker.title')}>
        <AppPicker embedded />
      </Section>
      <Section title={t('parsers.pasteJson')}>
        <View style={styles.padded}>
          <AppInput
            label={t('parsers.pasteJson')}
            value={json}
            onChangeText={setJson}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppButton label={t('common.save')} onPress={importParser} />
        </View>
      </Section>
      <Section title={t('tabs.history')}>
        <View style={styles.padded}>
          {rows.map((row) => (
            <View key={row.id} style={styles.capture}>
              <Text style={[styles.body, { color: theme.text }]}>
                {row.title} · {row.amount_minor ?? ''} · {row.status}
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>{row.body}</Text>
            </View>
          ))}
          {rows.length === 0 && (
            <Text style={[styles.body, { color: theme.textSecondary }]}>{t('noHistory')}</Text>
          )}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12 },
  body: { fontSize: 16, lineHeight: 22 },
  capture: { gap: 6, paddingVertical: 8 },
});
