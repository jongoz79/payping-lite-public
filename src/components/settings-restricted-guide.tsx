import { StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

export function RestrictedSettingsGuide() {
  const theme = useTheme();
  const { t } = useI18n();
  const steps = [
    t('onboarding.restrictedStep1'),
    t('onboarding.restrictedStep2'),
    t('onboarding.restrictedStep3'),
    t('onboarding.restrictedStep4'),
  ];

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {t('onboarding.restrictedTitle')}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{t('onboarding.restrictedIntro')}</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <Text style={[styles.number, { color: theme.text }]}>{index + 1}.</Text>
            <Text style={[styles.body, styles.stepText, { color: theme.textSecondary }]}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 21 },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  number: {
    width: 24,
    flexShrink: 0,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  stepText: { flex: 1, flexShrink: 1 },
});
