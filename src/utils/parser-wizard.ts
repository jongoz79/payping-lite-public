import { normalise } from '../parser/engine';
import type { Direction, Parser, Platform, RuleExtraction } from '../parser/engine';

export type NotificationField = 'body' | 'title';

export interface WizardToken {
  text: string;
  start: number;
  end: number;
  source: string;
}

export interface TextSelection {
  start: number;
  end: number;
  source?: NotificationField;
}

export interface ParserWizardInput {
  notification: {
    platform: Platform;
    sourceApp: string;
    title: string;
    body: string;
  };
  direction: Direction;
  amount: TextSelection;
  counterparty?: TextSelection;
  id?: string;
  name?: string;
}

type SelectionKind = 'amount' | 'counterparty';
type ResolvedSelection = TextSelection & { kind: SelectionKind };

const amountPattern = String.raw`[\d,]+(?:\.\d{1,2})?`;

export function tokenizeNotification(source: string): WizardToken[] {
  const normalised = normalise(source);
  const tokens: WizardToken[] = [];
  for (const match of normalised.matchAll(/\S+/g)) {
    const start = match.index;
    tokens.push({ text: match[0], start, end: start + match[0].length, source: normalised });
  }
  return tokens;
}

export function generateAmountPattern(
  source: string,
  amount: TextSelection,
  counterparty?: TextSelection,
): string {
  return buildExtractionPattern(normalise(source), amount, 'amount', counterparty);
}

export function generateCounterpartyPattern(
  source: string,
  counterparty: TextSelection,
  amount?: TextSelection,
): string {
  return buildExtractionPattern(normalise(source), counterparty, 'counterparty', amount);
}

export function createParserFromNotification({
  notification,
  direction,
  amount,
  counterparty,
  id = parserId(notification.sourceApp),
  name = notification.sourceApp,
}: ParserWizardInput): Parser {
  const sources = {
    title: normalise(notification.title),
    body: normalise(notification.body),
  };
  if (!sources.body) throw new Error('A notification body is required to create a parser.');

  return {
    schemaVersion: 1,
    id,
    name,
    version: 1,
    androidPackages: notification.platform === 'android' ? [notification.sourceApp] : [],
    iosAppNames: notification.platform === 'ios' ? [notification.sourceApp] : [],
    rules: [
      {
        id: `${id}.${direction}.v1`,
        priority: 100,
        match: buildMatchPatterns(sources, amount, counterparty),
        direction,
        extract: {
          amount: buildExtraction(sources, amount, 'amount', counterparty),
          ...(counterparty
            ? { counterparty: buildExtraction(sources, counterparty, 'counterparty', amount) }
            : {}),
        },
      },
    ],
  };
}

function buildExtraction(
  sources: Record<NotificationField, string>,
  target: TextSelection,
  targetKind: SelectionKind,
  other?: TextSelection,
): RuleExtraction {
  const field = target.source ?? 'body';
  const pattern = buildExtractionPattern(
    sources[field],
    target,
    targetKind,
    other?.source === target.source ? other : undefined,
  );
  return field === 'title' ? { pattern, source: field } : pattern;
}

function buildExtractionPattern(
  source: string,
  target: TextSelection,
  targetKind: SelectionKind,
  other?: TextSelection,
): string {
  const selections = resolveSelections(source, target, targetKind, other);
  return buildPattern(source, selections, targetKind);
}

function buildMatchPatterns(
  sources: Record<NotificationField, string>,
  amount: TextSelection,
  counterparty?: TextSelection,
): { title?: string; body?: string } {
  const match: { title?: string; body?: string } = {};
  for (const field of ['title', 'body'] as const) {
    const target = amount.source === field || (!amount.source && field === 'body')
      ? amount
      : counterparty?.source === field ? counterparty : undefined;
    if (!target) continue;
    const targetKind = target === amount ? 'amount' : 'counterparty';
    const other = target === amount ? counterparty : amount;
    const selections = resolveSelections(
      sources[field],
      target,
      targetKind,
      other?.source === target.source || (!other?.source && !target.source && field === 'body')
        ? other
        : undefined,
    );
    match[field] = buildPattern(sources[field], selections);
  }
  return match;
}

function resolveSelections(
  source: string,
  target: TextSelection,
  targetKind: SelectionKind,
  other?: TextSelection,
): ResolvedSelection[] {
  const selections = [resolveSelection(source, target, targetKind)];
  if (other) {
    selections.push(
      resolveSelection(source, other, targetKind === 'amount' ? 'counterparty' : 'amount'),
    );
  }
  selections.sort((a, b) => a.start - b.start);
  if (selections.length === 2 && selections[0].end > selections[1].start) {
    throw new Error('Amount and counterparty selections must not overlap.');
  }
  return selections;
}

function resolveSelection(
  source: string,
  selection: TextSelection,
  kind: SelectionKind,
): ResolvedSelection {
  if (
    !Number.isInteger(selection.start) ||
    !Number.isInteger(selection.end) ||
    selection.start < 0 ||
    selection.end > source.length ||
    selection.start >= selection.end
  ) {
    throw new Error('Selection offsets must identify a non-empty part of the source text.');
  }
  if (kind === 'counterparty') return { ...selection, kind };

  const selected = source.slice(selection.start, selection.end);
  const match = /\d[\d,]*(?:\.\d{1,2})?/.exec(selected);
  if (!match) throw new Error('The amount selection must contain a number.');
  const start = selection.start + match.index;
  return { start, end: start + match[0].length, kind };
}

function buildPattern(
  source: string,
  selections: ResolvedSelection[],
  namedGroup?: SelectionKind,
): string {
  let pattern = '';
  let offset = 0;
  for (const selection of selections) {
    pattern += escapeLiteral(source.slice(offset, selection.start));
    const contents = selectionContents(source, selection);
    pattern += selection.kind === namedGroup ? `(?<${namedGroup}>${contents})` : `(?:${contents})`;
    offset = selection.end;
  }
  pattern += escapeLiteral(source.slice(offset));
  const last = selections[selections.length - 1];
  return last.kind === 'counterparty' && last.end === source.length ? `${pattern}$` : pattern;
}

function selectionContents(source: string, selection: ResolvedSelection): string {
  if (selection.kind === 'amount') return amountPattern;
  const selected = source.slice(selection.start, selection.end);
  return source[selection.end] === '.' && !selected.includes('.')
    ? String.raw`[^.]+?`
    : String.raw`[^,;]+?`;
}

function escapeLiteral(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join(' ');
}

function parserId(sourceApp: string): string {
  return (
    sourceApp
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/^[^a-z]+/, '') || 'custom-parser'
  );
}
