import { formatSpokenAmount } from '@/utils/format';

import type { ParseResult } from './engine';

/**
 * Speak all-caps names as words ("IMRAAN CORNER" → "Imraan Corner") but keep short acronyms (PLT, KJL),
 * and drop long terminal/account numbers ("MAXIS-AUTO 2375810146") that would be read digit by digit.
 */
export function spokenName(name: string): string {
  return name
    .replace(/(^|\s)\d{5,}(?=\s|$)/g, '')
    .replace(/[A-Za-z]+/g, (word) =>
      word.length >= 4 && word === word.toUpperCase() ? word[0] + word.slice(1).toLowerCase() : word,
    )
    .trim();
}

export const DEFAULT_TTS_TEMPLATE = '{sign} {amount}[, {app}][, {payee}]';
export const TTS_TEMPLATE_MAX = 200;
export interface TtsTemplates {
  in?: string | null;
  out?: string | null;
}

/**
 * Fill a user template. Tokens: {sign} {amount} {app} {payee}. A [bracketed part] is spoken only when every
 * token inside it has a value; outside brackets an empty token is dropped and stray commas/spaces are tidied.
 * Mirrors AnnouncementText.render (Kotlin) and ParseResult.render (Swift); shared via tts-fixtures.json.
 */
export function renderTtsTemplate(template: string, values: Record<string, string>): string {
  const token = /\{(sign|amount|app|payee)\}/g;
  const fill = (text: string) => text.replace(token, (_, key: string) => values[key] ?? '');
  return template
    .replace(/\[([^[\]]*)\]/g, (_, inner: string) =>
      [...inner.matchAll(token)].every((m) => values[m[1]]) ? fill(inner) : '',
    )
    .replace(token, (_, key: string) => values[key] ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/,(\s*,)+/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '');
}

/** Short announcement: sign + amount, app, payee, or the user's template. Shared with Kotlin and Swift via tts-fixtures.json. */
export function ttsText(
  result: ParseResult,
  language: 'en' | 'ms' = 'en',
  appName?: string | null,
  templates?: TtsTemplates,
): string | null {
  if (result.confidence === 'none' || result.direction === 'info' || result.amountMinor === null) return null;

  const incoming = result.direction === 'in';
  const values = {
    sign: language === 'ms' ? (incoming ? 'Tambah' : 'Tolak') : incoming ? 'Plus' : 'Minus',
    amount: formatSpokenAmount(result.amountMinor, result.currency, language),
    app: appName?.trim() ?? '',
    payee: spokenName(result.counterparty ?? ''),
  };
  const custom = (incoming ? templates?.in : templates?.out)?.trim();
  return (custom && renderTtsTemplate(custom, values)) || renderTtsTemplate(DEFAULT_TTS_TEMPLATE, values);
}
