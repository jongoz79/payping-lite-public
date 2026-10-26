import { File, Paths } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { HistoryView, type HistoryFilters } from '@/components/history-view';
import {
  correctCapture,
  getCaptures,
  getCaptureTotals,
  getSelectedApps as getSelectedAppRows,
  updateCaptureStatus,
  useCaptureRefresh,
  type CaptureFilters,
  type CaptureRow,
  type CaptureTotals,
} from '@/db';
import { useI18n } from '@/i18n';
import { getInstalledApps, getSelectedApps, type InstalledApp } from '@/native/capture';
import { capturesToCsv } from '@/utils/csv';
import { dayKey, startOfToday } from '@/utils/format';

const PAGE_SIZE = 50;

function captureFilters(filters: HistoryFilters): CaptureFilters {
  const now = new Date();
  const today = startOfToday(now);
  let from: number | undefined;
  let to: number | undefined;
  if (filters.dateFilter === 'today') from = today;
  if (filters.dateFilter === 'yesterday') {
    from = today - 86400000;
    to = today - 1;
  }
  if (filters.dateFilter === 'week') from = today - 6 * 86400000;
  if (filters.dateFilter === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (filters.dateFilter === 'custom') {
    const parsedStart = Date.parse(`${filters.customStart}T00:00:00`);
    const parsedEnd = Date.parse(`${filters.customEnd}T23:59:59`);
    from = Number.isNaN(parsedStart) ? undefined : parsedStart;
    to = Number.isNaN(parsedEnd) ? undefined : parsedEnd;
  }
  return {
    from,
    to,
    direction: filters.direction === 'all' ? undefined : filters.direction,
    status: filters.needsCheck ? 'needs_review' : undefined,
    sourceApp: filters.sourceApp ?? undefined,
    search: filters.query,
  };
}

function totalsByDay(rows: CaptureRow[], filters: HistoryFilters): Record<string, CaptureTotals> {
  const totals: Record<string, CaptureTotals> = {};
  for (const row of rows) {
    const key = dayKey(row.posted_at);
    if (totals[key]) continue;
    const from = startOfToday(new Date(row.posted_at));
    totals[key] = getCaptureTotals({ ...captureFilters(filters), from, to: from + 86400000 - 1 });
  }
  return totals;
}

export default function HistoryScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ needsCheck?: string }>();
  const [filters, setFilters] = useState<HistoryFilters>({
    dateFilter: 'week',
    direction: 'all',
    needsCheck: params.needsCheck === 'true',
    query: '',
    sourceApp: null,
    customStart: '',
    customEnd: '',
  });
  const [rows, setRows] = useState<CaptureRow[]>([]);
  const [dayTotals, setDayTotals] = useState<Record<string, CaptureTotals>>({});
  const [hasMore, setHasMore] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const loadingMore = useRef(false);

  const refresh = useCallback(() => {
    const page = getCaptures({ ...captureFilters(filters), limit: PAGE_SIZE });
    setRows(page);
    setDayTotals(totalsByDay(page, filters));
    setHasMore(page.length === PAGE_SIZE);
    try {
      const nativeSelection = getSelectedApps();
      setApps(
        nativeSelection.length > 0
          ? nativeSelection
          : getSelectedAppRows().map((app) => ({ ...app, iconUri: '' })),
      );
      void getInstalledApps()
        .then((installed) => {
          const icons = new Map(installed.map((app) => [app.package, app.iconUri]));
          setApps((current) => current.map((app) => ({ ...app, iconUri: icons.get(app.package) ?? '' })));
        })
        .catch(() => undefined);
    } catch {
      setApps(getSelectedAppRows().map((app) => ({ ...app, iconUri: '' })));
    }
  }, [filters]);
  useCaptureRefresh(refresh);

  const loadMore = useCallback(() => {
    const last = rows.at(-1);
    if (!last || !hasMore || loadingMore.current) return;
    loadingMore.current = true;
    const page = getCaptures({
      ...captureFilters(filters),
      beforePostedAt: last.posted_at,
      beforeId: last.id,
      limit: PAGE_SIZE,
    });
    setRows((current) => [...current, ...page]);
    setDayTotals((current) => ({ ...current, ...totalsByDay(page, filters) }));
    setHasMore(page.length === PAGE_SIZE);
    loadingMore.current = false;
  }, [filters, hasMore, rows]);

  const changeFilters = useCallback((next: HistoryFilters) => {
    setFilters(next);
    const page = getCaptures({ ...captureFilters(next), limit: PAGE_SIZE });
    setRows(page);
    setDayTotals(totalsByDay(page, next));
    setHasMore(page.length === PAGE_SIZE);
  }, []);

  const exportCsv = async () => {
    try {
      const captures = getCaptures(captureFilters(filters));
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
    }
  };

  return (
    <HistoryView
      key={params.needsCheck === 'true' ? 'needs-check' : 'all'}
      rows={rows}
      apps={apps}
      dayTotals={dayTotals}
      initialNeedsCheck={params.needsCheck === 'true'}
      onFiltersChange={changeFilters}
      onCreateParser={(row) => router.push(`/parser-create?captureId=${row.id}`)}
      onEdit={(row) => router.push(`/capture/${row.id}`)}
      onFlip={(row) => {
        correctCapture(row.id, { direction: row.direction === 'in' ? 'out' : 'in' });
        if (row.status === 'needs_review') updateCaptureStatus(row.id, 'logged');
        refresh();
      }}
      onExport={exportCsv}
      onEndReached={loadMore}
    />
  );
}
