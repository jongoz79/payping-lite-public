import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppPicker } from '@/components/app-picker';
import { AppButton, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';

export default function AppsScreen() {
  const { t } = useI18n();

  return (
    <Screen
      title={t('appPicker.title')}
      scroll={false}
      contentStyle={styles.content}
      action={<AppButton variant="text" label={t('common.back')} onPress={() => router.back()} />}
    >
      <AppPicker />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 0 },
});
