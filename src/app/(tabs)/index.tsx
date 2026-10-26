import { appLabel } from '@/utils/apps';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useBackgroundAllowed } from '@/components/background-access';
import { TodayView } from '@/components/today-view';
import { Loading } from '@/components/ui';
import {
  correctCapture,
  getCaptureCount,
  getCaptures,
  getCaptureTotals,
  getSelectedApps as getSelectedAppRows,
  getSetting,
  getTtsTemplates,
  updateCaptureStatus,
  useCaptureRefresh,
  type CaptureRow,
  type CaptureTotals,
} from '@/db';
import {
  getInstalledApps,
  getPermissionStatus,
  getSelectedApps,
  isListenerConnected,
  openNotificationAccessSettings,
  requestIgnoreBatteryOptimizations,
  speakTest,
  type InstalledApp,
} from '@/native/capture';
import { useI18n } from '@/i18n';
import { ttsText } from '@/parser/tts';
import { startOfToday } from '@/utils/format';

const PAGE_SIZE = 50;

function KeepTodayAwake() {
  useKeepAwake();
  return null;
}

export default function TodayScreen() {
  const { language } = useI18n();
  const backgroundAllowed = useBackgroundAllowed();
  const [rows, setRows] = useState<CaptureRow[]>([]);
  const [reviewRows, setReviewRows] = useState<CaptureRow[]>([]);
  const [parserPrompt, setParserPrompt] = useState<CaptureRow | null>(null);
  const [latest, setLatest] = useState<CaptureRow | null>(null);
  const [totals, setTotals] = useState<CaptureTotals>({
    paymentCount: 0,
    inMinor: 0,
    outMinor: 0,
  });
  const [receivedCount, setReceivedCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied'>('denied');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [keepAwake, setKeepAwake] = useState(false);
  const [onboarded, setOnboarded] = useState(true);
  const loadingMore = useRef(false);

  const refresh = useCallback(() => {
    const from = startOfToday();
    const feed = getCaptures({ from, status: 'logged', limit: PAGE_SIZE });
    setRows(feed);
    setHasMore(feed.length === PAGE_SIZE);
    setReviewRows(getCaptures({ status: 'needs_review', limit: 3 }));
    setReviewCount(getCaptureCount({ status: 'needs_review' }));
    setParserPrompt(getCaptures({ status: 'needs_review', parserId: null, limit: 1 })[0] ?? null);
    const latestIn = getCaptures({
      from,
      status: 'logged',
      direction: 'in',
      limit: 1,
    })[0];
    const latestOut = getCaptures({
      from,
      status: 'logged',
      direction: 'out',
      limit: 1,
    })[0];
    setLatest(
      latestIn && latestOut
        ? latestIn.posted_at >= latestOut.posted_at
          ? latestIn
          : latestOut
        : (latestIn ?? latestOut ?? null),
    );
    setTotals(getCaptureTotals({ from }));
    setReceivedCount(getCaptureCount({ from, status: 'logged', direction: 'in' }));
    setPaidCount(getCaptureCount({ from, status: 'logged', direction: 'out' }));
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
          setApps((current) =>
            current.map((app) => ({
              ...app,
              iconUri: icons.get(app.package) ?? '',
            })),
          );
        })
        .catch(() => undefined);
    } catch {
      setApps(getSelectedAppRows().map((app) => ({ ...app, iconUri: '' })));
    }
    setPermission(getPermissionStatus());
    setConnected(Platform.OS === 'ios' || isListenerConnected());
    setKeepAwake(getSetting('keep_screen_on') === 'true');
    setOnboarded(getSetting('onboarding_complete') === 'true');
    setLoading(false);
  }, []);
  useCaptureRefresh(refresh);

  const loadMore = useCallback(() => {
    const last = rows.at(-1);
    if (!last || !hasMore || loadingMore.current) return;
    loadingMore.current = true;
    const page = getCaptures({
      from: startOfToday(),
      status: 'logged',
      beforePostedAt: last.posted_at,
      beforeId: last.id,
      limit: PAGE_SIZE,
    });
    setRows((current) => [...current, ...page]);
    setHasMore(page.length === PAGE_SIZE);
    loadingMore.current = false;
  }, [hasMore, rows]);

  const spokenText = (row: CaptureRow) =>
    ttsText(
      {
        ruleId: row.rule_id,
        direction: row.direction,
        amountMinor: row.amount_minor,
        currency: row.currency,
        counterparty: row.counterparty ?? undefined,
        reference: row.reference ?? undefined,
        confidence: row.confidence,
      },
      language,
      appLabel(apps, row.source_app),
      getTtsTemplates(),
    );

  if (!onboarded) return <Redirect href="/onboarding" />;
  if (loading) return <Loading />;

  return (
    <>
      {keepAwake && <KeepTodayAwake />}
      <TodayView
        backgroundAllowed={backgroundAllowed}
        onAllowBackground={() => {
          try {
            requestIgnoreBatteryOptimizations();
          } catch {}
        }}
        rows={rows}
        reviewRows={reviewRows}
        reviewCount={reviewCount}
        latest={latest}
        latestSpoken={latest ? (spokenText(latest) ?? undefined) : undefined}
        totals={totals}
        receivedCount={receivedCount}
        paidCount={paidCount}
        parserPrompt={parserPrompt}
        apps={apps}
        permission={permission}
        listenerConnected={connected}
        capturePlatform={Platform.OS === 'ios' ? 'ios' : 'android'}
        selectedCount={apps.length}
        onEnableAccess={openNotificationAccessSettings}
        onChooseApps={() => router.push('/apps')}
        onSeeAllReviews={() => router.push({ pathname: '/history', params: { needsCheck: 'true' } })}
        onReview={(row, direction) => {
          if (direction === 'ignored') updateCaptureStatus(row.id, 'ignored');
          else
            correctCapture(row.id, {
              direction: row.direction === direction ? undefined : direction,
            });
          if (direction !== 'ignored') updateCaptureStatus(row.id, 'logged');
          refresh();
        }}
        onFlip={(row) => {
          correctCapture(row.id, {
            direction: row.direction === 'in' ? 'out' : 'in',
          });
          refresh();
        }}
        onEdit={(row) => router.push(`/capture/${row.id}`)}
        onCreateParser={(row) => router.push(`/parser-create?captureId=${row.id}`)}
        onReplay={(row) => {
          const text = spokenText(row);
          if (text) speakTest(text);
        }}
        onEndReached={loadMore}
      />
    </>
  );
}
