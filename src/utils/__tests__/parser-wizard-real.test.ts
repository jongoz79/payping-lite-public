import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { normalise, parse } from '../../parser/engine';
import type { Direction, GenericConfig, ParseInput } from '../../parser/engine';
import { createParserFromNotification } from '../parser-wizard';
import type { NotificationField, TextSelection } from '../parser-wizard';

interface RealFixture extends ParseInput {
  name: string;
  expect: {
    direction: Direction;
    amountMinor?: number | null;
    counterparty?: string;
  };
}

const generic: GenericConfig = {
  amountPatterns: [],
  debitKeywords: [],
  creditKeywords: [],
  counterpartyPatterns: { in: [], out: [] },
  referencePatterns: [],
};

function selection(source: string, text: string, field: NotificationField): TextSelection {
  const start = source.toLowerCase().indexOf(text.toLowerCase());
  if (start < 0) throw new Error(`Missing "${text}" in "${source}"`);
  return { start, end: start + text.length, source: field };
}

function amountTexts(amountMinor: number): string[] {
  const decimal = (amountMinor / 100).toFixed(2);
  const comma = decimal.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return [...new Set([decimal, comma, decimal.replace(/\.00$/, ''), comma.replace(/\.00$/, '')])];
}

const fixtures = readdirSync(join(process.cwd(), 'parser-library', 'fixtures-real'))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .flatMap((file) => {
    const rows = JSON.parse(
      readFileSync(join(process.cwd(), 'parser-library', 'fixtures-real', file), 'utf8'),
    ) as RealFixture[];
    return rows.map((fixture) => ({ ...fixture, name: `${file}: ${fixture.name}` }));
  });
const moneyFixtures = fixtures.filter((fixture) => fixture.expect.amountMinor != null);

test('real fixture corpus includes both money and non-money notifications', () => {
  expect(fixtures.length).toBeGreaterThan(moneyFixtures.length);
  expect(moneyFixtures.length).toBeGreaterThan(0);
});

test.each(moneyFixtures.map((fixture) => [fixture.name, fixture] as const))(
  'wizard parses its source notification: %s',
  (_name, fixture) => {
    const body = normalise(fixture.body);
    const title = normalise(fixture.title);
    const amountMinor = fixture.expect.amountMinor!;
    const amountText = amountTexts(amountMinor).find((text) => body.includes(text));
    if (!amountText) throw new Error(`Missing expected amount ${amountMinor} in "${fixture.body}"`);
    const amount = selection(body, amountText, 'body');

    let counterparty: TextSelection | undefined;
    if (fixture.expect.counterparty) {
      const expected = normalise(fixture.expect.counterparty);
      const field = body.toLowerCase().includes(expected.toLowerCase()) ? 'body' : 'title';
      counterparty = selection(field === 'body' ? body : title, expected, field);
    }

    const parser = createParserFromNotification({
      notification: fixture,
      direction: fixture.expect.direction,
      amount,
      counterparty,
    });
    const result = parse(fixture, [parser], generic);
    expect(result).toMatchObject({
      direction: fixture.expect.direction,
      amountMinor,
      confidence: 'high',
    });
    if (fixture.expect.counterparty) {
      expect(result.counterparty?.toLowerCase()).toBe(fixture.expect.counterparty.toLowerCase());
    } else {
      expect(result.counterparty).toBeUndefined();
    }
  },
);
