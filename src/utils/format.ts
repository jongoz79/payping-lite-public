import type { Direction } from '@/parser/engine';

export function formatAmount(amountMinor: number | null, currency = 'MYR', direction?: Direction): string {
  if (amountMinor === null) return currency;
  const major = Math.floor(Math.abs(amountMinor) / 100);
  const minor = String(Math.abs(amountMinor) % 100).padStart(2, '0');
  const sign = direction === 'in' ? '+' : direction === 'out' ? '−' : '';
  return `${sign}${currency === 'MYR' ? 'RM' : currency} ${major.toLocaleString('en-MY')}.${minor}`;
}

export function formatSpokenAmount(
  amountMinor: number | null,
  currency = 'MYR',
  language: 'en' | 'ms' = 'en',
): string {
  if (amountMinor === null) return '';
  const major = Math.floor(Math.abs(amountMinor) / 100);
  const minor = Math.abs(amountMinor) % 100;
  if (currency === 'MYR') {
    if (minor === 0) return `${major} ringgit`;
    if (major === 0) return language === 'ms' ? `${minor} sen` : `${minor} cents`;
    return `${major} ringgit ${minor} sen`;
  }
  return `${major}${minor > 0 ? `.${String(minor).padStart(2, '0')}` : ''} ${currency}`;
}

export function formatTime(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
