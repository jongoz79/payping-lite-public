import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, PixelRatio, Platform, StyleSheet, View } from 'react-native';

import { AppPicker } from '@/components/app-picker';
import { AppText as Text } from '@/components/app-text';
import { BackgroundAccess } from '@/components/background-access';
import { RestrictedSettingsGuide } from '@/components/settings-restricted-guide';
import { AppButton, Icon, Screen, Section } from '@/components/ui';
import { setSetting } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type TranslationKey } from '@/i18n';
import { openNotificationAccessSettings, speakTest } from '@/native/capture';
import { ttsText } from '@/parser/tts';

export default function OnboardingScreen() {
  const theme = useTheme();
  const { t, language } = useI18n();
  const [step, setStep] = useState(0);
  const android = Platform.OS === 'android';
  const lastStep = android ? 4 : 2;
  const stepCount = lastStep + 1;
  const stackNavigation = PixelRatio.getFontScale() >= 1.75;
  const titleKey: TranslationKey = android
    ? (
        [
          'onboarding.privacyTitle',
          'onboarding.notificationTitle',
          'onboarding.appsTitle',
          'onboarding.backgroundTitle',
          'onboarding.voiceTitle',
        ] as const
      )[step]
    : (['onboarding.privacyTitle', 'onboarding.shortcutTitle', 'onboarding.voiceTitle'] as const)[step];
  const stepProgress = t('onboarding.stepProgress' as TranslationKey, {
    current: step + 1,
    total: stepCount,
  });
  const iconName =
    step === 0
      ? 'shield-check-outline'
      : step === lastStep
        ? 'volume-high'
        : android && step === 1
          ? 'bell-outline'
          : android && step === 3
            ? 'battery-heart-variant'
            : 'cellphone-cog';

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
        )!,
      );
    } catch {
      Alert.alert(t('errors.voice'));
    }
  };

  const finish = () => {
    try {
      setSetting('onboarding_complete', 'true');
      router.replace('/');
    } catch {
      Alert.alert(t('errors.saveFailed'));
    }
  };

  return (
    <Screen>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 1,
          max: stepCount,
          now: step + 1,
          text: stepProgress,
        }}
        style={styles.progress}
      >
        {Array.from({ length: stepCount }, (_, index) => (
          <View
            key={index}
            style={[styles.progressSegment, { backgroundColor: index <= step ? theme.text : theme.border }]}
          />
        ))}
      </View>

      <View style={styles.heading}>
        <View style={[styles.iconTile, { backgroundColor: theme.backgroundSelected }]}>
          <Icon name={iconName} size={34} color={theme.ink} />
        </View>
        <Text style={[styles.stepProgress, { color: theme.textSecondary }]}>{stepProgress}</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {t(titleKey)}
        </Text>
      </View>

      {step === 0 && (
        <Text style={[styles.body, { color: theme.textSecondary }]}>{t('onboarding.privacyBody')}</Text>
      )}

      {android && step === 1 && (
        <>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t('onboarding.notificationBody')}
          </Text>
          <AppButton
            large
            variant="primary"
            icon="bell-outline"
            label={t('onboarding.enableNotifications')}
            onPress={() => {
              try {
                openNotificationAccessSettings();
              } catch {
                Alert.alert(t('errors.generic'));
              }
            }}
          />
          <Section title={t('settings.troubleshooting')}>
            <RestrictedSettingsGuide />
          </Section>
        </>
      )}

      {android && step === 2 && (
        <>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t('onboarding.appsBody')}</Text>
          <AppPicker embedded />
        </>
      )}

      {android && step === 3 && (
        <Section title={t('background.title')}>
          <BackgroundAccess />
        </Section>
      )}

      {!android && step === 1 && (
        <>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t('onboarding.shortcutBody')}</Text>
          <Section title={t('onboarding.automationTitle')}>
            <Text style={[styles.guide, { color: theme.textSecondary }]}>
              {t('onboarding.automationBody')}
            </Text>
          </Section>
        </>
      )}

      {step === lastStep && (
        <>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t('onboarding.voiceBody')}</Text>
          <AppButton large icon="volume-high" label={t('settings.testVoice')} onPress={testVoice} />
        </>
      )}

      <View style={[styles.navigation, stackNavigation && styles.navigationStacked]}>
        <AppButton
          label={t('common.back')}
          icon="arrow-left"
          disabled={step === 0}
          onPress={() => setStep((current) => Math.max(0, current - 1))}
          style={stackNavigation ? styles.navigationButtonStacked : styles.navigationButton}
        />
        <AppButton
          large
          variant="primary"
          label={step === lastStep ? t('onboarding.getStarted') : t('common.next')}
          onPress={() => (step === lastStep ? finish() : setStep((current) => current + 1))}
          style={stackNavigation ? styles.navigationButtonStacked : styles.navigationButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, width: '100%', paddingVertical: 4 },
  progressSegment: { height: 5, flex: 1, borderRadius: 5 },
  heading: { alignItems: 'flex-start', gap: 12, paddingTop: 4 },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepProgress: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.48,
  },
  body: { fontSize: 16, lineHeight: 26 },
  guide: { padding: 16, fontSize: 16, lineHeight: 24 },
  navigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 20,
  },
  navigationStacked: { flexDirection: 'column-reverse' },
  navigationButton: { flexGrow: 1, flexShrink: 1, flexBasis: 140 },
  navigationButtonStacked: { flexBasis: 'auto', width: '100%' },
});
