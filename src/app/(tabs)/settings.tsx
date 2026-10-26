import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { BackgroundAccess } from '@/components/background-access';
import { RestrictedSettingsGuide } from '@/components/settings-restricted-guide';
import { AppButton, Screen, Section, SettingsRow } from '@/components/ui';
import {
  clearCaptureHistory,
  getCaptures,
  getSelectedApps,
  getSettings,
  getTtsTemplates,
  resetData,
  setSetting,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type LanguagePreference } from '@/i18n';
import {
  getPermissionStatus,
  isListenerConnected,
  openNotificationAccessSettings,
  setSelectedApps,
  speakTest,
} from '@/native/capture';
import { ttsText } from '@/parser/tts';
import { capturesToCsv } from '@/utils/csv';

// Opens in the browser; the app itself still makes no network calls.
const PRIVACY_POLICY_URL = 'https://jongoz79.github.io/payping-lite-public/privacy-policy.html';
const RATE_OPTIONS = ['0.75', '1', '1.25', '1.5'] as const;
const CLEAN_OPTIONS = ['off', '7', '30', '90'] as const;

function enabled(value: string | undefined, fallback = false): boolean {
  return value === undefined ? fallback : value === 'true';
}

function OptionButton({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.textSecondary : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optionButtonLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { t, language, preference, setPreference } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedCount, setSelectedCount] = useState(0);
  const [listenerActive, setListenerActive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);

  const load = useCallback(() => {
    const settings = Object.fromEntries(getSettings().map((setting) => [setting.key, setting.value]));
    setValues(settings);
    setSelectedCount(getSelectedApps().length);
    setListenerActive(
      Platform.OS === 'android' && getPermissionStatus() === 'granted' && isListenerConnected(),
    );
  }, []);

  useFocusEffect(load);

  const update = (key: string, value: string) => {
    const previous = values[key];
    setValues((current) => ({ ...current, [key]: value }));
    try {
      setSetting(key, value);
    } catch {
      setValues((current) => ({ ...current, [key]: previous ?? '' }));
      Alert.alert(t('errors.saveFailed'));
    }
  };

  const testVoice = () => {
    try {
      speakTest(
        ttsText(
          {
            ruleId: null,
            direction: 'in',
            amountMinor: 1250,
            currency: 'MYR',
            counterparty: 'Ali',
            confidence: 'high',
          },
          language,
          'TNG eWallet',
          getTtsTemplates(),
        )!,
      );
    } catch {
      Alert.alert(t('errors.voice'));
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const captures = getCaptures();
      if (captures.length === 0) {
        Alert.alert(t('csv.noData'));
        return;
      }
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
      const file = new File(Paths.cache, `payping-${new Date().toISOString().slice(0, 10)}.csv`);
      file.create({ overwrite: true });
      await file.write(capturesToCsv(captures));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: t('csv.export'),
      });
    } catch {
      Alert.alert(t('errors.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const clearHistory = () => {
    Alert.alert(t('data.clearHistoryTitle'), t('data.clearHistoryBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('data.clearHistoryAction'),
        style: 'destructive',
        onPress: () => {
          try {
            clearCaptureHistory();
          } catch {
            Alert.alert(t('errors.clearFailed'));
          }
        },
      },
    ]);
  };

  const resetAll = () => {
    Alert.alert(t('data.resetTitle'), t('data.resetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('data.resetAction'),
        style: 'destructive',
        onPress: () => {
          try {
            resetData();
            setSelectedApps([]);
            router.replace('/onboarding');
          } catch {
            Alert.alert(t('errors.resetFailed'));
          }
        },
      },
    ]);
  };

  const changeLanguage = (next: LanguagePreference) => {
    void setPreference(next).catch(() => Alert.alert(t('errors.saveFailed')));
  };

  const tapVersion = () => {
    const next = versionTaps + 1;
    if (next >= 7) {
      setVersionTaps(0);
      router.push('/dev-capture');
    } else {
      setVersionTaps(next);
    }
  };

  const speechEnabled = enabled(values.tts_enabled, true);
  const duckEnabled = enabled(values.tts_duck, true);
  const keepAwake = enabled(values.keep_screen_on);
  const speechRate = values.tts_rate ?? '1';
  const autoClean = values.review_autoclean_days ?? 'off';

  return (
    <Screen title={t('tabs.settings')}>
      {Platform.OS === 'android' && (
        <Section title={t('settings.capture')}>
          <SettingsRow
            icon="apps"
            title={t('settings.capturedApps')}
            value={t('settings.activeApps', { count: selectedCount })}
            onPress={() => router.push('/apps')}
          />
        </Section>
      )}

      <Section title={t('settings.voice')}>
        <SettingsRow
          icon="volume-high"
          title={t('settings.speakPayments')}
          onPress={() => update('tts_enabled', String(!speechEnabled))}
          right={
            <Switch
              accessibilityLabel={t('settings.speakPayments')}
              value={speechEnabled}
              onValueChange={(value) => update('tts_enabled', String(value))}
              trackColor={{
                false: theme.backgroundSelected,
                true: theme.accentPrimary,
              }}
              thumbColor={theme.backgroundElement}
              ios_backgroundColor={theme.backgroundSelected}
            />
          }
        />
        <SettingsRow
          icon="volume-medium"
          title={t('settings.duckAudio')}
          description={t('settings.duckAudioDescription')}
          onPress={() => update('tts_duck', String(!duckEnabled))}
          right={
            <Switch
              accessibilityLabel={t('settings.duckAudio')}
              value={duckEnabled}
              onValueChange={(value) => update('tts_duck', String(value))}
              trackColor={{
                false: theme.backgroundSelected,
                true: theme.accentPrimary,
              }}
              thumbColor={theme.backgroundElement}
              ios_backgroundColor={theme.backgroundSelected}
            />
          }
        />
        <SettingsRow
          icon="message-text-outline"
          title={t('settings.announcementWording')}
          description={t('settings.announcementWordingDescription')}
          onPress={() => router.push('/announcement')}
        />
        <View style={[styles.rate, { borderColor: theme.border }]}>
          <Text style={[styles.rateLabel, { color: theme.text }]}>{t('settings.speechRate')}</Text>
          <View style={styles.chips}>
            {RATE_OPTIONS.map((rate) => (
              <OptionButton
                key={rate}
                label={`${rate}x`}
                accessibilityLabel={t('a11y.speechRate', { rate: `${rate}x` })}
                selected={speechRate === rate}
                onPress={() => update('tts_rate', rate)}
              />
            ))}
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <AppButton icon="play" label={t('settings.testVoice')} onPress={testVoice} />
        </View>
      </Section>

      <Section title={t('settings.reviewQueue')}>
        <View style={styles.padded}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>{t('review.autoClean')}</Text>
          {autoClean !== 'off' && (
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {t('review.autoCleanDescription', { days: Number(autoClean) })}
            </Text>
          )}
          <View style={styles.chips}>
            {CLEAN_OPTIONS.map((days) => (
              <OptionButton
                key={days}
                label={
                  days === 'off'
                    ? t('common.off')
                    : t(`review.days${days}` as 'review.days7' | 'review.days30' | 'review.days90')
                }
                selected={autoClean === days}
                onPress={() => update('review_autoclean_days', days)}
              />
            ))}
          </View>
        </View>
      </Section>

      <Section title={t('settings.display')}>
        <SettingsRow
          icon="cellphone"
          title={t('settings.keepAwake')}
          description={t('settings.keepAwakeDescription')}
          onPress={() => update('keep_screen_on', String(!keepAwake))}
          right={
            <Switch
              accessibilityLabel={t('settings.keepAwake')}
              value={keepAwake}
              onValueChange={(value) => update('keep_screen_on', String(value))}
              trackColor={{
                false: theme.backgroundSelected,
                true: theme.accentPrimary,
              }}
              thumbColor={theme.backgroundElement}
              ios_backgroundColor={theme.backgroundSelected}
            />
          }
        />
        <View style={styles.padded}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>{t('language.title')}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {t('language.description')}
          </Text>
          <View style={styles.chips}>
            {(['auto', 'en', 'ms'] as const).map((language) => (
              <OptionButton
                key={language}
                label={t(`language.${language}`)}
                selected={preference === language}
                onPress={() => changeLanguage(language)}
              />
            ))}
          </View>
        </View>
      </Section>

      {Platform.OS === 'android' && (
        <Section title={t('background.title')}>
          <BackgroundAccess />
        </Section>
      )}

      {Platform.OS === 'android' && (
        <Section title={t('settings.troubleshooting')}>
          <SettingsRow
            icon="bell-check-outline"
            title={t('settings.listenerStatus')}
            value={listenerActive ? t('settings.active') : t('common.off')}
            onPress={() => {
              try {
                openNotificationAccessSettings();
              } catch {
                Alert.alert(t('errors.generic'));
              }
            }}
          />
          <RestrictedSettingsGuide />
        </Section>
      )}

      <Section title={t('settings.dataPrivacy')}>
        <SettingsRow
          icon="file-delimited-outline"
          title={t('csv.export')}
          description={t('csv.description')}
          value={exporting ? t('common.loading') : undefined}
          onPress={exporting ? undefined : () => void exportCsv()}
        />
        <SettingsRow
          danger
          icon="alert-octagon-outline"
          title={t('data.clearHistory')}
          description={t('a11y.irreversible')}
          onPress={clearHistory}
        />
        <SettingsRow
          danger
          icon="alert-octagon-outline"
          title={t('data.resetApp')}
          description={t('a11y.irreversible')}
          onPress={resetAll}
        />
        <SettingsRow
          icon="shield-lock-outline"
          title={t('settings.privacyPolicy')}
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL).catch(() => Alert.alert(t('errors.generic')))}
        />
      </Section>

      <Section title={t('settings.about')}>
        <SettingsRow
          icon="information-outline"
          title="PayPing Lite"
          description={t('settings.offlineLicense')}
          value={t('settings.version', {
            version: Constants.expoConfig?.version ?? '3.0.0',
          })}
          onPress={tapVersion}
          right={<View />}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rate: { padding: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rateLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: {
    minWidth: 56,
    minHeight: 48,
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonContainer: { padding: 16 },
  padded: { padding: 16, gap: 12 },
  optionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.65 },
});
