export const CAPTURE_CSV_HEADERS = [
  'id',
  'platform',
  'source_app',
  'parser_id',
  'title',
  'body',
  'posted_at',
  'captured_at',
  'dedupe_key',
  'rule_id',
  'direction',
  'amount_rm',
  'currency',
  'counterparty',
  'reference',
  'confidence',
  'status',
  'user_note',
  'user_edited',
  'synced_at',
] as const;

export type CaptureCsvValue = string | number | null | undefined;

export type CaptureCsvRow = {
  [K in (typeof CAPTURE_CSV_HEADERS)[number] as K extends 'amount_rm' ? never : K]: CaptureCsvValue;
} & { amount_minor: number | null | undefined };

export function escapeCsv(value: CaptureCsvValue): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatAmountMinor(amountMinor: number | null | undefined): string {
  return amountMinor === null || amountMinor === undefined ? '' : (amountMinor / 100).toFixed(2);
}

export function capturesToCsv(captures: CaptureCsvRow | CaptureCsvRow[]): string {
  const rows = Array.isArray(captures) ? captures : [captures];
  return [
    CAPTURE_CSV_HEADERS.join(','),
    ...rows.map((capture) =>
      CAPTURE_CSV_HEADERS.map((header) =>
        escapeCsv(header === 'amount_rm' ? formatAmountMinor(capture.amount_minor) : capture[header]),
      ).join(','),
    ),
  ].join('\r\n');
}
