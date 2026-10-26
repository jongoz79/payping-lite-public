import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { ParserEditor } from '@/components/parser-editor';
import { AppButton, EmptyState, Loading, Screen } from '@/components/ui';
import { getCaptures, getParserById, useCaptureRefresh } from '@/db';
import type { CaptureRow, ParserRow } from '@/db';
import { useI18n } from '@/i18n';

export default function ParserEditScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { t } = useI18n();
  const [row, setRow] = useState<ParserRow | null>(null);
  const [captures, setCaptures] = useState<CaptureRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setRow(getParserById(id));
      setCaptures(getCaptures({ limit: 100 }));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useCaptureRefresh(refresh);

  return (
    <Screen title={t('parsers.editor')}>
      {loading ? (
        <Loading />
      ) : row ? (
        <ParserEditor
          key={row.id}
          row={row}
          captures={captures}
          onSaved={() => router.back()}
          onDeleted={() => router.back()}
        />
      ) : (
        <>
          <EmptyState icon="alert-circle-outline" title={t('parsers.editor')} body={t('errors.generic')} />
          <AppButton label={t('common.back')} onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
