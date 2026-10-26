import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ParserWizard } from '@/components/parser-wizard';
import { AppButton, EmptyState, Loading, Screen } from '@/components/ui';
import { getCaptureById, useCaptureRefresh } from '@/db';
import type { CaptureRow } from '@/db';
import { useI18n } from '@/i18n';
import { getInstalledApps } from '@/native/capture';
import { appLabel, fallbackAppLabel } from '@/utils/apps';

export default function ParserCreateScreen() {
  const params = useLocalSearchParams<{
    captureId?: string | string[];
    id?: string | string[];
  }>();
  const captureId = params.captureId ?? params.id;
  const id = Array.isArray(captureId) ? captureId[0] : captureId;
  const { t } = useI18n();
  const [capture, setCapture] = useState<CaptureRow | null>(null);
  const [appName, setAppName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      setCapture(id ? getCaptureById(id) : null);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useCaptureRefresh(refresh);

  const sourceApp = capture?.source_app;
  useEffect(() => {
    if (!sourceApp) return;
    let active = true;
    void getInstalledApps()
      .then((apps) => {
        if (active) setAppName(appLabel(apps, sourceApp));
      })
      .catch(() => {
        if (active) setAppName(fallbackAppLabel(sourceApp));
      });
    return () => {
      active = false;
    };
  }, [sourceApp]);

  return (
    <Screen
      title={t('parsers.create')}
      action={<AppButton variant="text" label={t('common.back')} onPress={() => router.back()} />}
    >
      {loading || (capture && !appName) ? (
        <Loading />
      ) : capture ? (
        <>
          <ParserWizard capture={capture} appName={appName} onSaved={() => router.back()} />
          <AppButton label={t('common.back')} onPress={() => router.back()} />
        </>
      ) : (
        <>
          <EmptyState icon="bell-off-outline" title={t('parsers.create')} body={t('errors.generic')} />
          <AppButton label={t('common.back')} onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
