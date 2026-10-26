import { useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppButton, Icon } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type TranslationKey } from '@/i18n';
import {
  getDeviceMaker,
  isIgnoringBatteryOptimizations,
  openAppDetails,
  requestIgnoreBatteryOptimizations,
} from '@/native/capture';

function safeAllowed(): boolean {
  try {
    return isIgnoringBatteryOptimizations();
  } catch {
    return true;
  }
}

/** Battery-optimisation state, refreshed when the user returns from Android's dialog or settings. */
export function useBackgroundAllowed(): boolean {
  const [allowed, setAllowed] = useState(safeAllowed);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAllowed(safeAllowed());
    });
    return () => subscription.remove();
  }, []);
  return allowed;
}

/** OEM power managers add their own switch on top of Android's battery optimisation. */
function makerTip(maker: string): TranslationKey {
  if (/xiaomi|redmi|poco/.test(maker)) return 'background.tipXiaomi';
  if (/oppo|realme|oneplus/.test(maker)) return 'background.tipOppo';
  if (/vivo|iqoo/.test(maker)) return 'background.tipVivo';
  if (/huawei|honor/.test(maker)) return 'background.tipHuawei';
  if (/samsung/.test(maker)) return 'background.tipSamsung';
  return 'background.tipOther';
}

export function BackgroundAccess() {
  const theme = useTheme();
  const { t } = useI18n();
  const allowed = useBackgroundAllowed();
  let maker = '';
  try {
    maker = getDeviceMaker();
  } catch {}

  const run = (action: () => void) => {
    try {
      action();
    } catch {
      Alert.alert(t('errors.generic'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.status, { backgroundColor: theme.backgroundSelected }]}>
        <Icon
          name={allowed ? 'check-circle' : 'alert-circle-outline'}
          size={22}
          color={allowed ? theme.moneyIn : theme.danger}
        />
        <Text style={[styles.title, { color: allowed ? theme.text : theme.danger }]}>
          {allowed ? t('background.allowed') : t('background.notAllowed')}
        </Text>
      </View>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{t('background.why')}</Text>
      {!allowed && (
        <AppButton
          large
          variant="primary"
          icon="battery-heart-variant"
          label={t('background.allow')}
          onPress={() => run(requestIgnoreBatteryOptimizations)}
        />
      )}
      <View style={[styles.tip, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name="cellphone-cog" size={20} />
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>{t(makerTip(maker))}</Text>
      </View>
      <AppButton
        icon="cog-outline"
        label={t('background.openAppSettings')}
        onPress={() => run(openAppDetails)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  status: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    flex: 1,
    flexBasis: 180,
  },
  body: { fontSize: 14, lineHeight: 21 },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  tipText: { flex: 1, flexShrink: 1, fontSize: 14, lineHeight: 21 },
});
