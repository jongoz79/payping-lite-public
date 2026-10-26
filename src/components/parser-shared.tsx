import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText as Text } from '@/components/app-text';
import type { SelectedAppRow } from '@/db';
import { notifyCapturesChanged } from '@/db/useCaptureRefresh';
import { useTheme } from '@/hooks/use-theme';
import type { useI18n } from '@/i18n';
import { reparse } from '@/native/capture';
import type { Parser } from '@/parser/engine';

export function ParserErrors({ title, errors = [] }: { title?: string; errors?: string[] }) {
  const theme = useTheme();
  if (!title && errors.length === 0) return null;
  return (
    <View accessibilityRole="alert" style={styles.errors}>
      {title && <Text style={[styles.errorTitle, { color: theme.danger }]}>{title}</Text>}
      {errors.map((error, index) => (
        <Text key={`${index}-${error}`} style={[styles.errorText, { color: theme.danger }]}>
          {error}
        </Text>
      ))}
    </View>
  );
}

export async function shareParser(parser: Parser): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is unavailable.');
  const file = new File(Paths.cache, `${parser.id}.json`);
  file.create({ intermediates: true, overwrite: true });
  await file.write(JSON.stringify(parser, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: parser.name,
  });
}

export function confirmReparse(
  parser: Parser,
  t: ReturnType<typeof useI18n>['t'],
  onComplete?: () => void,
): void {
  Alert.alert(t('parsers.reparseTitle'), t('parsers.reparseBody'), [
    { text: t('common.cancel'), style: 'cancel', onPress: onComplete },
    {
      text: t('common.confirm'),
      onPress: () => {
        void (async () => {
          try {
            const count = await reparse();
            notifyCapturesChanged();
            Alert.alert(t('parsers.reparse'), t('parsers.reparseComplete', { count }));
            onComplete?.();
          } catch {
            Alert.alert(t('errors.generic'));
          }
        })();
      },
    },
  ]);
}

export function parserApps(parser: Parser): string[] {
  return [...parser.androidPackages, ...parser.iosAppNames];
}

export function parserAppLabels(parser: Parser, selectedApps: SelectedAppRow[]): string[] {
  return [
    ...parser.androidPackages.map((packageName) => appLabel(packageName, selectedApps)),
    ...parser.iosAppNames,
  ];
}

export function appLabel(sourceApp: string, selectedApps: SelectedAppRow[]): string {
  const selected = selectedApps.find((app) => app.package === sourceApp);
  if (selected?.label && selected.label !== sourceApp) return selected.label;
  const segment = sourceApp.split('.').filter(Boolean).at(-1) ?? sourceApp;
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function relativeTime(
  timestamp: number,
  locale: string,
  justNow: string,
  translate: ReturnType<typeof useI18n>['t'],
): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) return justNow;
  const units = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
  ] as const;
  const match = units.find((candidate) => elapsedSeconds >= candidate.seconds) ?? units.at(-1)!;
  const count = Math.floor(elapsedSeconds / match.seconds);
  try {
    return new Intl.RelativeTimeFormat(locale, {
      numeric: 'always',
      style: 'short',
    }).format(-count, match.unit);
  } catch {
    return translate(`time.${match.unit}`, { count });
  }
}

const styles = StyleSheet.create({
  errors: { gap: 6, paddingVertical: 4 },
  errorTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  errorText: { fontSize: 16, lineHeight: 22 },
});
