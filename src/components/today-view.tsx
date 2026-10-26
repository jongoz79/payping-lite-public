import { FlashList } from '@shopify/flash-list';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { AppIcon, CaptureListItem } from '@/components/capture-row';
import { ReviewCard } from '@/components/review-card';
import { AppButton, EmptyState, Icon, Screen } from '@/components/ui';
import type { CaptureRow, CaptureTotals } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { InstalledApp } from '@/native/capture';
import { appLabel } from '@/utils/apps';
import { formatAmount, formatSpokenAmount, formatTime, startOfToday } from '@/utils/format';

export type TodayViewProps = {
  rows: CaptureRow[];
  apps: InstalledApp[];
  permission: 'granted' | 'denied';
  listenerConnected: boolean;
  selectedCount: number;
  capturePlatform?: 'android' | 'ios';
  reviewRows?: CaptureRow[];
  reviewCount?: number;
  latest?: CaptureRow | null;
  latestSpoken?: string;
  totals?: CaptureTotals;
  receivedCount?: number;
  paidCount?: number;
  parserPrompt?: CaptureRow | null;
  backgroundAllowed?: boolean;
  onAllowBackground?: () => void;
  onEnableAccess: () => void;
  onChooseApps: () => void;
  onSeeAllReviews?: () => void;
  onReview: (row: CaptureRow, direction: 'in' | 'out' | 'ignored') => void;
  onFlip?: (row: CaptureRow) => void;
  onEdit: (row: CaptureRow) => void;
  onCreateParser: (row: CaptureRow) => void;
  onReplay: (row: CaptureRow) => void;
  onEndReached?: () => void;
};

export function TodayView(props: TodayViewProps) {
  const { t, language } = useI18n();
  const locale = language === 'ms' ? 'ms-MY' : 'en-MY';
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const todayStart = startOfToday();
  const loggedToday = props.rows.filter((row) => row.status === 'logged' && row.posted_at >= todayStart);
  const reviewRows = (props.reviewRows ?? props.rows.filter((row) => row.status === 'needs_review')).slice(
    0,
    3,
  );
  const reviewCount = props.reviewCount ?? reviewRows.length;
  const received =
    props.totals?.inMinor ??
    loggedToday
      .filter((row) => row.direction === 'in' && row.currency === 'MYR')
      .reduce((sum, row) => sum + (row.amount_minor ?? 0), 0);
  const paid =
    props.totals?.outMinor ??
    loggedToday
      .filter((row) => row.direction === 'out' && row.currency === 'MYR')
      .reduce((sum, row) => sum + (row.amount_minor ?? 0), 0);
  const paymentCount =
    props.totals?.paymentCount ?? loggedToday.filter((row) => row.direction !== 'info').length;
  const receivedCount = props.receivedCount ?? loggedToday.filter((row) => row.direction === 'in').length;
  const paidCount = props.paidCount ?? loggedToday.filter((row) => row.direction === 'out').length;
  const latest =
    props.latest === undefined ? loggedToday.find((row) => row.direction !== 'info') : props.latest;
  const latestApp = latest ? props.apps.find((app) => app.package === latest.source_app) : undefined;
  const parserPrompt =
    props.parserPrompt === undefined ? reviewRows.find((row) => row.parser_id === null) : props.parserPrompt;
  const accessOff = props.permission === 'denied' || !props.listenerConnected;
  const ios = props.capturePlatform === 'ios';
  const backgroundOff = !ios && !accessOff && props.selectedCount > 0 && props.backgroundAllowed === false;
  const healthLabel = ios
    ? t('iosCaptureReady')
    : accessOff
      ? t('notificationAccessOff')
      : props.selectedCount === 0
        ? t('noAppsSelected')
        : backgroundOff
          ? t('background.lateWarning')
          : t(props.selectedCount === 1 ? 'listeningToApp' : 'listeningToApps', {
              count: props.selectedCount,
            });
  const healthWarning = !ios && (accessOff || backgroundOff || props.selectedCount === 0);
  const dateLabel = new Date()
    .toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();

  const header = (
    <View style={styles.headerContent}>
      <Pressable
        accessibilityRole={ios ? undefined : 'button'}
        accessibilityLabel={healthLabel}
        accessibilityHint={
          !ios && (accessOff || backgroundOff || props.selectedCount === 0)
            ? t('a11y.openSettingsHint')
            : undefined
        }
        onPress={
          ios
            ? undefined
            : accessOff
              ? props.onEnableAccess
              : props.selectedCount === 0
                ? props.onChooseApps
                : backgroundOff
                  ? props.onAllowBackground
                  : undefined
        }
        style={({ pressed }) => [styles.health, { borderColor: theme.border }, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.healthDot,
            {
              backgroundColor: healthWarning
                ? theme.danger
                : props.selectedCount === 0 && !ios
                  ? theme.textSecondary
                  : theme.moneyIn,
            },
          ]}
        />
        <Text style={[styles.healthText, { color: healthWarning ? theme.danger : theme.text }]}>
          {healthLabel}
        </Text>
        <Icon
          name={healthWarning ? 'alert-circle-outline' : 'check-circle-outline'}
          size={20}
          color={healthWarning ? theme.danger : theme.moneyIn}
        />
      </Pressable>

      {latest ? (
        <View style={[styles.counter, { backgroundColor: theme.counter, borderColor: theme.counterLine }]}>
          <View style={styles.counterApp}>
            <AppIcon app={latestApp} size={30} />
            <Text style={[styles.counterAppText, { color: theme.counterText }]}>
              {appLabel(latestApp ? [latestApp] : [], latest.source_app)}
            </Text>
            <Text style={[styles.counterTime, { color: theme.counterMuted }]}>
              {formatTime(latest.posted_at, locale)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${latest.direction === 'in' ? t('received') : t('paid')} ${formatSpokenAmount(latest.amount_minor, latest.currency, language)}${latest.counterparty ? ` ${language === 'ms' ? (latest.direction === 'in' ? 'daripada' : 'kepada') : latest.direction === 'in' ? 'from' : 'to'} ${latest.counterparty}` : ''}`}
            onPress={() => props.onEdit(latest)}
            style={({ pressed }) => [styles.counterMain, pressed && styles.pressed]}
          >
            <Text style={[styles.counterOverline, { color: theme.counterMuted }]}>
              {t('today.latestConfirmed')}
            </Text>
            <Text
              style={[
                styles.latestAmount,
                fontScale >= 1.6 && styles.latestAmountLargeText,
                { color: theme.accentPrimary },
              ]}
            >
              {latest.amount_minor === null
                ? t('capture.noAmount')
                : formatAmount(latest.amount_minor, latest.currency, latest.direction)}
            </Text>
            <Text style={[styles.latestDirection, { color: theme.counterMuted }]}>
              {latest.direction === 'in' ? t('received') : latest.direction === 'out' ? t('paid') : ''}
            </Text>
            <Text style={[styles.latestName, { color: theme.counterText }]}>
              {latest.counterparty ?? latest.title}
            </Text>
            {latest.reference && (
              <Text style={[styles.latestReference, { color: theme.counterMuted }]}>{latest.reference}</Text>
            )}
          </Pressable>
          {props.latestSpoken ? (
            <View style={[styles.spokenRow, { borderColor: theme.counterLine }]}>
              <Text style={[styles.spokenText, { color: theme.counterSpoken }]}>
                {t('today.spoken', { message: props.latestSpoken })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('a11y.replay', {
                  amount: formatSpokenAmount(latest.amount_minor, latest.currency, language),
                })}
                onPress={() => props.onReplay(latest)}
                style={({ pressed }) => [
                  styles.replay,
                  { borderColor: theme.counterLine },
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="volume-high" size={22} color={theme.counterText} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.totals}>
        <View style={[styles.totalTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.tileLabel, { color: theme.muted }]}>{t('today.receivedToday')}</Text>
          <Text testID="today-total-received" style={[styles.tileAmount, { color: theme.moneyIn }]}>
            {formatAmount(received, 'MYR', 'in')}
          </Text>
          <Text style={[styles.tileCount, { color: theme.muted }]}>
            {t(receivedCount === 1 ? 'paymentCountOne' : 'paymentsCount', { count: receivedCount })}
          </Text>
        </View>
        <View style={[styles.totalTile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.tileLabel, { color: theme.muted }]}>{t('today.paidToday')}</Text>
          <Text testID="today-total-paid" style={[styles.tileAmount, { color: theme.moneyOut }]}>
            {formatAmount(paid, 'MYR', 'out')}
          </Text>
          <Text style={[styles.tileCount, { color: theme.muted }]}>
            {t(paidCount === 1 ? 'paymentCountOne' : 'paymentsCount', { count: paidCount })}
          </Text>
        </View>
      </View>

      {reviewRows.length > 0 && (
        <View style={styles.reviewSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              {t('needsYourCheck', { count: reviewCount })}
            </Text>
            {reviewCount > 3 && (
              <Pressable accessibilityRole="button" onPress={props.onSeeAllReviews} style={styles.viewAll}>
                <Text style={[styles.viewAllText, { color: theme.text }]}>{t('today.viewAll')}</Text>
              </Pressable>
            )}
          </View>
          {reviewRows.map((row) => (
            <ReviewCard
              key={row.id}
              row={row}
              app={props.apps.find((app) => app.package === row.source_app)}
              onReview={(direction) => props.onReview(row, direction)}
              onEdit={() => props.onEdit(row)}
              onCreateParser={() => props.onCreateParser(row)}
            />
          ))}
          {reviewCount > 3 && (
            <Text style={[styles.seeAllText, { color: theme.textSecondary }]}>
              {t('seeAllReviews', { count: reviewCount })}
            </Text>
          )}
        </View>
      )}

      {parserPrompt && !reviewRows.some((row) => row.id === parserPrompt.id) && (
        <AppButton
          label={t('makePayPingUnderstand', { app: appLabel(props.apps, parserPrompt.source_app) })}
          accessibilityLabel={t('makePayPingUnderstand', {
            app: appLabel(props.apps, parserPrompt.source_app),
          })}
          icon="lightbulb-outline"
          variant="accent"
          onPress={() => props.onCreateParser(parserPrompt)}
        />
      )}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('today.allActivity')}</Text>
        <Text style={[styles.feedCount, { color: theme.textSecondary }]}>
          {t(paymentCount === 1 ? 'paymentCountOne' : 'paymentsCount', { count: paymentCount })}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen
      title={t('today')}
      action={<Text style={[styles.date, { color: theme.textSecondary }]}>{dateLabel}</Text>}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <FlashList
        data={loggedToday}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => (
          <CaptureListItem
            row={item}
            app={props.apps.find((app) => app.package === item.source_app)}
            locale={locale}
            receivedLabel={t('received')}
            paidLabel={t('paid')}
            unknownLabel={t('needsCheck')}
            onPress={() => props.onEdit(item)}
            onFlip={props.onFlip ? () => props.onFlip!(item) : undefined}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState icon="cash-clock" title={t('noPaymentsYet')} body={t('noPaymentsBody')} />
        }
        ListFooterComponent={<View style={styles.footer} />}
        onEndReached={props.onEndReached}
        onEndReachedThreshold={0.5}
        extraData={props.apps}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0, paddingTop: 0, gap: 0 },
  listContent: { paddingHorizontal: 16 },
  headerContent: { gap: 16 },
  health: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  healthText: { fontSize: 14, lineHeight: 20, fontWeight: '700', flex: 1 },
  counter: { borderRadius: 24, borderWidth: 1, padding: 20, overflow: 'hidden' },
  counterApp: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  counterAppText: { flex: 1, flexBasis: 100, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  counterTime: { fontSize: 12, lineHeight: 17 },
  counterMain: { paddingTop: 24, paddingBottom: 20, gap: 6 },
  counterOverline: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  latestAmount: {
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -1.04,
    fontVariant: ['tabular-nums'],
  },
  latestAmountLargeText: { fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  latestDirection: { fontSize: 12, lineHeight: 17, fontWeight: '800', textTransform: 'uppercase' },
  latestName: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  latestReference: { fontSize: 12, lineHeight: 17 },
  spokenRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  spokenText: { flex: 1, flexBasis: 180, fontSize: 12, lineHeight: 17 },
  replay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  totalTile: {
    flex: 1,
    flexBasis: 145,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 7,
  },
  tileLabel: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tileAmount: { fontSize: 22, lineHeight: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileCount: { fontSize: 12, lineHeight: 17 },
  reviewSection: { gap: 4 },
  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    flexBasis: 180,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  viewAll: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  viewAllText: { fontSize: 12, lineHeight: 17, fontWeight: '800' },
  seeAllText: { fontSize: 12, lineHeight: 17, textAlign: 'right', paddingBottom: 8 },
  feedCount: { fontSize: 12, lineHeight: 17 },
  date: { fontSize: 12, lineHeight: 17, fontWeight: '700', letterSpacing: 0.8 },
  footer: { height: 24 },
  pressed: { opacity: 0.7 },
});
