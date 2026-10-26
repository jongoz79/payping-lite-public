export type Platform = 'android' | 'ios';
export type Direction = 'in' | 'out' | 'info';
export type Confidence = 'high' | 'low' | 'none';

export interface ParseInput {
  platform: Platform;
  sourceApp: string;
  title: string;
  body: string;
}

export type RuleExtraction =
  | string
  | { pattern: string; source?: 'body' | 'title' | 'bodyThenTitle' };

export interface ParserRule {
  id: string;
  priority: number;
  match: { title?: string; body?: string };
  direction: Direction;
  confidence?: 'high' | 'none';
  extract?: {
    amount?: RuleExtraction;
    counterparty?: RuleExtraction;
    reference?: RuleExtraction;
  };
}

export interface Parser {
  schemaVersion: 1;
  id: string;
  name: string;
  version: number;
  author?: string;
  description?: string;
  androidPackages: string[];
  iosAppNames: string[];
  rules: ParserRule[];
}

export interface GenericConfig {
  amountPatterns: string[];
  debitKeywords: string[];
  creditKeywords: string[];
  counterpartyPatterns: { in: string[]; out: string[] };
  referencePatterns: string[];
}

export interface ParseResult {
  ruleId: string | null;
  direction: Direction;
  amountMinor: number | null;
  currency: string;
  counterparty?: string;
  reference?: string;
  confidence: Confidence;
}

export function normalise(value: string): string {
  return value
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/â€™|â€˜/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, '-')
    .replace(/â/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchingParsers(input: ParseInput, parsers: Parser[]): Parser[] {
  return parsers.filter((parser) => {
    if (input.platform === 'android') return parser.androidPackages.includes(input.sourceApp);
    return parser.iosAppNames.some((name) => name.toLowerCase() === input.sourceApp.toLowerCase());
  });
}

export function parse(input: ParseInput, parsers: Parser[], generic: GenericConfig): ParseResult {
  const title = normalise(input.title).slice(0, 4000);
  const body = normalise(input.body).slice(0, 4000);
  const candidates = matchingParsers(input, parsers)
    .flatMap((parser) => parser.rules)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of candidates) {
    if (!matches(rule, title, body)) continue;
    if (rule.direction === 'info') {
      return {
        ruleId: rule.id,
        direction: 'info',
        amountMinor: null,
        currency: 'MYR',
        confidence: rule.confidence ?? 'high',
      };
    }

    const amountPattern = rule.extract?.amount;
    const amountMatch = amountPattern ? extractMatch(amountPattern, body, title) : undefined;
    const amountText = amountMatch?.groups?.amount;
    const amountMinor = amountText === undefined ? null : parseAmountMinor(amountText);
    if (amountMinor === null) continue;

    const result: ParseResult = {
      ruleId: rule.id,
      direction: rule.direction,
      amountMinor,
      currency: isoCurrency(amountMatch?.groups?.currency),
      confidence: rule.confidence ?? 'high',
    };
    const counterparty = extractOptional(rule.extract?.counterparty, 'counterparty', body, title);
    const reference = extractOptional(rule.extract?.reference, 'reference', body, title);
    if (counterparty) result.counterparty = counterparty;
    if (reference) result.reference = reference;
    return result;
  }

  return parseGeneric(title, body, generic);
}

function matches(rule: ParserRule, title: string, body: string): boolean {
  return Object.entries(rule.match).every(([field, pattern]) => {
    const value = field === 'title' ? title : body;
    return new RegExp(pattern, 'i').test(value);
  });
}

function extractOptional(
  extraction: RuleExtraction | undefined,
  group: string,
  body: string,
  title: string,
): string | undefined {
  if (!extraction) return undefined;
  const value = extractMatch(extraction, body, title)?.groups?.[group]?.replace(/\.+$/, '').trim();
  return value || undefined;
}

function extractMatch(
  extraction: RuleExtraction,
  body: string,
  title: string,
): RegExpExecArray | undefined {
  const pattern = typeof extraction === 'string' ? extraction : extraction.pattern;
  const source = typeof extraction === 'string' ? 'bodyThenTitle' : extraction.source;
  const values = source === 'title' ? [title] : source === 'body' ? [body] : [body, title];
  for (const value of values) {
    const match = new RegExp(pattern, 'i').exec(value);
    if (match) return match;
  }
  return undefined;
}

function isoCurrency(value: string | undefined): string {
  if (!value) return 'MYR';
  const code = value.toUpperCase();
  const mapped: Record<string, string> = {
    RM: 'MYR',
    'JP¥': 'JPY',
    '¥': 'JPY',
    'NZ$': 'NZD',
    'S$': 'SGD',
    'US$': 'USD',
    A$: 'AUD',
    $: 'USD',
    '£': 'GBP',
    '€': 'EUR',
  };
  return mapped[code] ?? (/^[A-Z]{3}$/.test(code) ? code : 'MYR');
}

function parseAmountMinor(value: string): number | null {
  const [wholeText, fractionText = ''] = value.replace(/,/g, '').split('.');
  if (!/^\d+$/.test(wholeText) || !/^\d{0,2}$/.test(fractionText)) return null;
  const whole = Number(wholeText);
  const amountMinor = whole * 100 + Number(fractionText.padEnd(2, '0'));
  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

function parseGeneric(title: string, body: string, generic: GenericConfig): ParseResult {
  const none: ParseResult = {
    ruleId: null,
    direction: 'info',
    amountMinor: null,
    currency: 'MYR',
    confidence: 'none',
  };

  let amountMinor: number | null = null;
  let negativeAmount = false;
  for (const pattern of generic.amountPatterns) {
    const amountMatch = extractMatch(pattern, body, title);
    const amountText = amountMatch?.groups?.amount;
    if (amountMatch && amountText !== undefined) {
      amountMinor = parseAmountMinor(amountText);
      if (amountMinor !== null) {
        // "-RM8" / "RM -8" is a sign; "Payment - RM8" is just a separator.
        negativeAmount = /^\s*(?:-(?:RM|MYR)|(?:RM|MYR)\s?-)/i.test(amountMatch[0]);
        break;
      }
    }
  }
  if (amountMinor === null || amountMinor === 0) return none;

  // Keyword-list fallback adapted from azimul-kabir/actua's FinancialMessageParser (GPL-3.0).
  const combined = `${title} ${body}`;
  const hasCredit = generic.creditKeywords.some((keyword) => containsKeyword(combined, keyword));
  let hasDebit = generic.debitKeywords.some(
    (keyword) =>
      !(keyword === 'transferred to' && combined.toLowerCase().includes('transferred to you')) &&
      containsKeyword(combined, keyword),
  );
  const lowerTitle = title.toLowerCase();
  if (!hasCredit && !hasDebit && (lowerTitle === 'payment' || lowerTitle === 'transfer')) {
    hasDebit = true;
  }

  let direction: Direction = 'info';
  if (hasCredit && !hasDebit) direction = 'in';
  if (hasDebit && !hasCredit) direction = 'out';
  if (hasCredit && hasDebit) direction = tieBreak(combined);
  // Keywords decide; a minus sign only says "money out" when no keyword does. It never turns a payment into money in.
  if (direction === 'info' && negativeAmount) direction = 'out';
  if (direction === 'info') return none;
  const keywordDirection = direction;

  const result: ParseResult = {
    ruleId: null,
    direction,
    amountMinor,
    currency: 'MYR',
    confidence: 'low',
  };
  const counterpartyPatterns = generic.counterpartyPatterns[keywordDirection];
  for (const pattern of counterpartyPatterns) {
    const counterparty = extractOptional(pattern, 'counterparty', body, title);
    if (counterparty) {
      result.counterparty = cleanName(counterparty);
      break;
    }
  }
  for (const pattern of generic.referencePatterns) {
    const reference = extractOptional(pattern, 'reference', body, title);
    if (reference) {
      result.reference = reference;
      break;
    }
  }
  return result;
}

const TIE_IN = ['received from', 'transferred to you', 'sent you', 'refunded', 'refund of', 'credited to your', 'credited into your', 'diterima daripada'];
const TIE_OUT = ['paid to', 'sent to', 'transferred to', 'payment to', 'debited from', 'dibayar kepada'];

/** Both keyword lists matched ("Payment of RM20 received from Ali"): the directional phrase wins. Mirrored in Kotlin and Swift. */
function tieBreak(text: string): Direction {
  if (TIE_IN.some((phrase) => containsKeyword(text, phrase))) return 'in';
  if (TIE_OUT.some((phrase) => containsKeyword(text, phrase))) return 'out';
  const lower = text.toLowerCase();
  if (lower.includes('credited') || lower.includes('dikreditkan')) return 'in';
  if (lower.includes('debited') || lower.includes('didebitkan')) return 'out';
  return 'info';
}

function containsKeyword(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let start = lowerText.indexOf(lowerKeyword);
  while (start !== -1) {
    const before = start === 0 ? '' : lowerText[start - 1];
    const end = start + lowerKeyword.length;
    const after = end === lowerText.length ? '' : lowerText[end];
    if (!/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after)) return true;
    start = lowerText.indexOf(lowerKeyword, start + 1);
  }
  return false;
}

function cleanName(value: string): string {
  return value
    .replace(/\s+at\s+\d{1,2}:\d{2}(?::\d{2})?$/i, '')
    .replace(/\s+(?:on|at|via|ref|for|and|to)$/i, '')
    .trim();
}
