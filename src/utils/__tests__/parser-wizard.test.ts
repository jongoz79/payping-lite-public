import { parse } from '../../parser/engine';
import type { GenericConfig } from '../../parser/engine';
import { validateParser } from '../../parser/validate';
import {
  createParserFromNotification,
  generateAmountPattern,
  generateCounterpartyPattern,
  tokenizeNotification,
} from '../parser-wizard';

const generic: GenericConfig = {
  amountPatterns: [],
  debitKeywords: [],
  creditKeywords: [],
  counterpartyPatterns: { in: [], out: [] },
  referencePatterns: [],
};

function selection(source: string, text: string) {
  const start = source.indexOf(text);
  if (start < 0) throw new Error(`Missing selection: ${text}`);
  return { start, end: start + text.length };
}

test('tagged amount and counterparty produce accepted portable patterns that extract the source', () => {
  const body = "You've received RM 1,234.50 from Ali & Sons (KL). Ref: A+B?";
  const notification = {
    platform: 'android' as const,
    sourceApp: 'com.example.bank',
    title: 'Money received',
    body,
  };
  const amount = selection(body, '1,234.50');
  const counterparty = selection(body, 'Ali & Sons (KL)');
  const parser = createParserFromNotification({
    notification,
    direction: 'in',
    amount,
    counterparty,
  });

  expect(tokenizeNotification(body)).toContainEqual({
    text: '1,234.50',
    start: amount.start,
    end: amount.end,
    source: body,
  });
  expect(generateAmountPattern(body, amount, counterparty)).toContain('(?<amount>');
  expect(generateCounterpartyPattern(body, counterparty, amount)).toContain('(?<counterparty>');
  expect(validateParser(parser)).toEqual({ ok: true, parser });
  expect(parse(notification, [parser], generic)).toMatchObject({
    ruleId: 'com-example-bank.in.v1',
    direction: 'in',
    amountMinor: 123450,
    counterparty: 'Ali & Sons (KL)',
    confidence: 'high',
  });

  const changed = {
    ...notification,
    body: "You've received RM 8.00 from Mei-Lin. Ref: A+B?",
  };
  expect(parse(changed, [parser], generic)).toMatchObject({
    amountMinor: 800,
    counterparty: 'Mei-Lin',
  });

  const endingWithName = 'Paid RM 2.00 to Ali';
  const endPattern = generateCounterpartyPattern(
    endingWithName,
    selection(endingWithName, 'Ali'),
    selection(endingWithName, '2.00'),
  );
  expect(new RegExp(endPattern).exec(endingWithName)?.groups?.counterparty).toBe('Ali');
});
