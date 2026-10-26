import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { CaptureListItem } from '@/components/capture-row';
import { AppButton, AppInput, Chip, EmptyState, Screen } from '@/components/ui';
import type { CaptureRow, CaptureTotals } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { InstalledApp } from '@/native/capture';
import { appLabel } from '@/utils/apps';
import { dayKey, formatAmount, formatDate } from '@/utils/format';

export type HistoryDateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
export type HistoryDirectionFilter = 'all' | 'in' | 'out';
export type HistoryFilters = {
  dateFilter: HistoryDateFilter;
  direction: HistoryDirectionFilter;
  needsCheck: boolean;
  query: string;
  sourceApp: string | null;
  customStart: string;
  customEnd: string;
};

type HistoryItem =
  | { type: 'day'; key: string; timestamp: number; incoming: number; outgoing: number }
  | { type: 'capture'; key: string; row: CaptureRow };

export function HistoryView({
  rows,
  apps,
  dayTotals = {},
  initialNeedsCheck = false,
  onFiltersChange,
  onCreateParser,
  onEdit,
  onFlip,
  onExport,
  onEndReached,
}: {
  rows: CaptureRow[];
  apps: InstalledApp[];
  dayTotals?: Record<string, CaptureTotals>;
  initialNeedsCheck?: boolean;
  onFiltersChange: (filters: HistoryFilters) => void;
  onCreateParser: (row: CaptureRow) => void;
  onEdit: (row: CaptureRow) => void;
  onFlip?: (row: CaptureRow) => void;
  onExport?: () => void;
  onEndReached?: () => void;
}) {
  const { t, language } = useI18n();
  const locale = language === 'ms' ? 'ms-MY' : 'en-MY';
  const theme = useTheme();
  const [dateFilter, setDateFilter] = useState<HistoryDateFilter>('week');
  const [direction, setDirection] = useState<HistoryDirectionFilter>('all');
  const [needsCheck, setNeedsCheck] = useState(initialNeedsCheck);
  const [query, setQuery] = useState('');
  const [sourceApp, setSourceApp] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const updateFilters = (next: Partial<HistoryFilters>) => {
    const updated = { dateFilter, direction, needsCheck, query, sourceApp, customStart, customEnd, ...next };
    if (next.dateFilter !== undefined) setDateFilter(next.dateFilter);
    if (next.direction !== undefined) setDirection(next.direction);
    if (next.needsCheck !== undefined) setNeedsCheck(next.needsCheck);
    if (next.query !== undefined) setQuery(next.query);
    if (next.sourceApp !== undefined) setSourceApp(next.sourceApp);
    if (next.customStart !== undefined) setCustomStart(next.customStart);
    if (next.customEnd !== undefined) setCustomEnd(next.customEnd);
    onFiltersChange(updated);
  };

  const items = useMemo<HistoryItem[]>(() => {
    const result: HistoryItem[] = [];
    let currentDay = '';
    let dayRows: CaptureRow[] = [];
    const addDay = () => {
      if (!dayRows.length) return;
      const logged = dayRows.filter((row) => row.status === 'logged' && row.currency === 'MYR');
      const totals = dayTotals[currentDay];
      result.push({
        type: 'day',
        key: `day-${currentDay}`,
        timestamp: dayRows[0].posted_at,
        incoming:
          totals?.inMinor ??
          logged
            .filter((row) => row.direction === 'in')
            .reduce((sum, row) => sum + (row.amount_minor ?? 0), 0),
        outgoing:
          totals?.outMinor ??
          logged
            .filter((row) => row.direction === 'out')
            .reduce((sum, row) => sum + (row.amount_minor ?? 0), 0),
      });
      result.push(...dayRows.map((row): HistoryItem => ({ type: 'capture', key: row.id, row })));
    };
    for (const row of rows) {
      const key = dayKey(row.posted_at);
      if (currentDay && key !== currentDay) {
        addDay();
        dayRows = [];
      }
      currentDay = key;
      dayRows.push(row);
    }
    addDay();
    return result;
  }, [rows, dayTotals]);

  const header = (
    <View style={styles.header}>
      <AppInput
        label={t('searchHistory')}
        value={query}
        onChangeText={(value) => updateFilters({ query: value })}
        placeholder={t('history.searchPlaceholder')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterGroup}
      >
        <Chip
          label={t('history.inOut')}
          selected={direction === 'all'}
          onPress={() => updateFilters({ direction: 'all', needsCheck: false })}
        />
        <Chip
          label={t('announcement.moneyIn')}
          selected={direction === 'in'}
          onPress={() => updateFilters({ direction: 'in', needsCheck: false })}
        />
        <Chip
          label={t('announcement.moneyOut')}
          selected={direction === 'out'}
          onPress={() => updateFilters({ direction: 'out', needsCheck: false })}
        />
        <Chip
          label={t('needsCheck')}
          selected={needsCheck}
          onPress={() => updateFilters({ needsCheck: !needsCheck })}
        />
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterGroup}
      >
        {(['all', 'today', 'yesterday', 'week', 'month', 'custom'] as const).map((filter) => (
          <Chip
            key={filter}
            label={t(filter === 'all' ? 'history.allDates' : filter)}
            selected={dateFilter === filter}
            onPress={() => updateFilters({ dateFilter: filter })}
          />
        ))}
        <Chip
          label={t('allApps')}
          selected={sourceApp === null}
          onPress={() => updateFilters({ sourceApp: null })}
        />
        {apps.map((app) => (
          <Chip
            key={app.package}
            label={appLabel(apps, app.package)}
            selected={sourceApp === app.package}
            onPress={() => updateFilters({ sourceApp: app.package })}
          />
        ))}
      </ScrollView>
      {dateFilter === 'custom' && (
        <View style={styles.customDates}>
          <AppInput
            label={t('fromDate')}
            value={customStart}
            onChangeText={(value) => updateFilters({ customStart: value })}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
          <AppInput
            label={t('toDate')}
            value={customEnd}
            onChangeText={(value) => updateFilters({ customEnd: value })}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
      )}
      {onExport && <AppButton label={t('csv.exportFiltered')} icon="download-outline" onPress={onExport} />}
    </View>
  );

  return (
    <Screen title={t('history')} scroll={false} contentStyle={styles.screenContent}>
      <FlashList
        data={items}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        renderItem={({ item }) => {
          if (item.type === 'day') {
            return (
              <View style={styles.dayGroup}>
                <Text accessibilityRole="header" style={[styles.dayTitle, { color: theme.text }]}>
                  {formatDate(item.timestamp, locale)}
                </Text>
                <Text style={[styles.dayTotal, { color: theme.textSecondary }]}>
                  {t('received')} {formatAmount(item.incoming)} · {t('paid')} {formatAmount(item.outgoing)}
                </Text>
              </View>
            );
          }
          const row = item.row;
          return (
            <View style={styles.captureGroup}>
              <CaptureListItem
                row={row}
                app={apps.find((app) => app.package === row.source_app)}
                locale={locale}
                receivedLabel={t('received')}
                paidLabel={t('paid')}
                unknownLabel={t('needsCheck')}
                isExpanded={expanded === row.id}
                onPress={() => setExpanded((current) => (current === row.id ? null : row.id))}
                onFlip={onFlip ? () => onFlip(row) : undefined}
              />
              {expanded === row.id && (
                <View style={styles.expanded}>
                  <Text style={[styles.rawTitle, { color: theme.text }]}>{row.title}</Text>
                  <Text
                    selectable
                    style={[
                      styles.rawBody,
                      { color: theme.textSecondary, backgroundColor: theme.backgroundSelected },
                    ]}
                  >
                    {row.body}
                  </Text>
                  <Text style={[styles.parserMeta, { color: theme.textSecondary }]}>
                    {row.parser_id ? `${row.parser_id} · ${row.rule_id ?? ''}` : t('genericFallback')}
                  </Text>
                  <View style={styles.expandedActions}>
                    <AppButton label={t('edit')} onPress={() => onEdit(row)} />
                    {!row.parser_id && (
                      <AppButton
                        label={t('createParserFromThis')}
                        variant="accent"
                        onPress={() => onCreateParser(row)}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="history" title={t('noHistory')} body={t('noHistoryBody')} />}
        ListFooterComponent={<View style={styles.footer} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        extraData={{ apps, expanded, locale }}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 0, paddingTop: 0, gap: 0 },
  listContent: { paddingHorizontal: 16 },
  header: { gap: 12, paddingBottom: 20 },
  filterGroup: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingRight: 16 },
  customDates: { gap: 12 },
  dayGroup: { gap: 6, paddingVertical: 12 },
  dayTitle: { fontSize: 20, lineHeight: 27, fontWeight: '800' },
  dayTotal: { fontSize: 12, lineHeight: 17 },
  captureGroup: { paddingHorizontal: 0 },
  expanded: { paddingVertical: 16, gap: 12 },
  rawTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  rawBody: { fontSize: 12, lineHeight: 20, fontFamily: 'monospace', padding: 12, borderRadius: 12 },
  parserMeta: { fontSize: 12, lineHeight: 17 },
  expandedActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { height: 24 },
});
