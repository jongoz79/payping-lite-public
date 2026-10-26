import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { ParserAddModal } from '@/components/parser-add-modal';
import { ParserGenericEditor } from '@/components/parser-generic';
import { ParserListItem } from '@/components/parser-list-item';
import { ParserErrors, confirmReparse, shareParser } from '@/components/parser-shared';
import { AppButton, EmptyState, Loading, Screen, SettingsRow } from '@/components/ui';
import {
  deleteParser,
  getCaptures,
  getParsers,
  getSelectedApps,
  setParserEnabled,
  useCaptureRefresh,
} from '@/db';
import type { CaptureRow, ParserRow, SelectedAppRow } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import type { Parser } from '@/parser/engine';

export default function ParsersScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const [rows, setRows] = useState<ParserRow[]>([]);
  const [captures, setCaptures] = useState<CaptureRow[]>([]);
  const [selectedApps, setSelectedApps] = useState<SelectedAppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGeneric, setShowGeneric] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(() => {
    try {
      setRows(getParsers());
      setCaptures(getCaptures());
      setSelectedApps(getSelectedApps());
      setError(null);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useCaptureRefresh(refresh);

  const parsers = useMemo(
    () =>
      rows.flatMap((row) => {
        try {
          return [{ row, parser: JSON.parse(row.json) as Parser }];
        } catch {
          return [];
        }
      }),
    [rows],
  );
  const lastMatched = useMemo(() => {
    const result = new Map<string, number>();
    for (const capture of captures) {
      if (!capture.parser_id) continue;
      result.set(capture.parser_id, Math.max(result.get(capture.parser_id) ?? 0, capture.posted_at));
    }
    return result;
  }, [captures]);

  const toggle = (row: ParserRow) => {
    try {
      setParserEnabled(row.id, row.enabled !== 1);
      refresh();
    } catch {
      setError(t('errors.saveFailed'));
    }
  };

  const share = async (parser: Parser) => {
    try {
      await shareParser(parser);
    } catch {
      setError(t('errors.generic'));
    }
  };

  const remove = (parser: Parser) => {
    Alert.alert(t('common.delete'), parser.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          try {
            deleteParser(parser.id);
            refresh();
          } catch {
            setError(t('errors.saveFailed'));
          }
        },
      },
    ]);
  };

  const addButton = (
    <AppButton
      label={t('parsers.add')}
      testID="parser-add"
      icon="plus"
      variant="primary"
      onPress={() => setAddOpen(true)}
    />
  );

  return (
    <Screen title={t('parsers.title')} action={parsers.length > 0 ? addButton : undefined}>
      <ParserErrors title={error ?? undefined} />
      {loading ? (
        <Loading />
      ) : parsers.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState icon="bank-outline" title={t('parsers.title')} body={t('parsers.empty')} />
          {addButton}
        </View>
      ) : (
        <View>
          <Text accessibilityRole="header" style={[styles.count, { color: theme.textSecondary }]}>
            {t(parsers.length === 1 ? 'parsers.rulesOne' : 'parsers.rules', {
              count: parsers.length,
            })}
          </Text>
          <View>
            {parsers.map(({ row, parser }) => (
              <ParserListItem
                key={row.id}
                row={row}
                parser={parser}
                selectedApps={selectedApps}
                lastMatched={lastMatched.get(parser.id) ?? null}
                onToggle={() => toggle(row)}
                onEdit={() =>
                  router.push({
                    pathname: '/parser-edit',
                    params: { id: row.id },
                  })
                }
                onShare={() => void share(parser)}
                onReparse={() => confirmReparse(parser, t, refresh)}
                onDelete={() => remove(parser)}
              />
            ))}
          </View>
        </View>
      )}
      <View style={styles.generic}>
        <SettingsRow
          icon="tune-variant"
          title={t('parsers.generic')}
          description={t('parsers.genericDescription')}
          onPress={() => setShowGeneric((visible) => !visible)}
        />
      </View>
      {showGeneric && <ParserGenericEditor />}
      {addOpen && (
        <ParserAddModal
          visible
          captures={captures}
          selectedApps={selectedApps}
          onClose={() => setAddOpen(false)}
          onImported={refresh}
          onCreate={(capture) =>
            router.push({
              pathname: '/parser-create',
              params: { captureId: capture.id },
            })
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: {
    paddingBottom: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  empty: { paddingVertical: 16, gap: 8 },
  generic: { borderRadius: 12, overflow: 'hidden' },
});
