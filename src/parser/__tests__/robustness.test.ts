import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as fc from 'fast-check';

import { parse } from '../engine';
import type { Direction, GenericConfig, ParseInput, Parser } from '../engine';
import { validateGeneric, validateParser } from '../validate';

interface Fixture extends ParseInput {
  name: string;
  real?: boolean;
}

const libraryDirectory = join(process.cwd(), 'parser-library');
const parsers = readdirSync(join(libraryDirectory, 'parsers'))
  .filter((file) => file.endsWith('.json'))
  .map(
    (file) =>
      JSON.parse(readFileSync(join(libraryDirectory, 'parsers', file), 'utf8')) as Parser,
  );
const generic = JSON.parse(
  readFileSync(join(libraryDirectory, 'generic.default.json'), 'utf8'),
) as GenericConfig;
const fixtures = ['fixtures', 'fixtures-real'].flatMap((directory) =>
  readdirSync(join(libraryDirectory, directory))
    .filter((file) => file.endsWith('.json'))
    .flatMap(
      (file) =>
        JSON.parse(readFileSync(join(libraryDirectory, directory, file), 'utf8')) as Fixture[],
    ),
);
const realFixtures = fixtures.filter((fixture) => fixture.real);
const sourceApps = parsers.flatMap((parser) => parser.androidPackages);
const directions: Direction[] = ['in', 'out', 'info'];

function parserWithMatch(pattern: string): Parser {
  return {
    schemaVersion: 1,
    id: 'robustness',
    name: 'Robustness test',
    version: 1,
    androidPackages: [],
    iosAppNames: [],
    rules: [
      {
        id: 'robustness.test.v1',
        priority: 1,
        match: { title: pattern },
        direction: 'info',
      },
    ],
  };
}

function expectValidMoney(result: ReturnType<typeof parse>): void {
  expect(directions).toContain(result.direction);
  expect(['high', 'low', 'none']).toContain(result.confidence);
  expect(result.ruleId === null || typeof result.ruleId === 'string').toBe(true);
  expect(result.currency).toMatch(/^[A-Z]{3}$/);
  if (result.direction === 'info') {
    expect(result.amountMinor).toBeNull();
  } else {
    expect(result.amountMinor).not.toBeNull();
    expect(Number.isSafeInteger(result.amountMinor)).toBe(true);
    expect(result.amountMinor).toBeGreaterThanOrEqual(0);
  }
}

describe('parser robustness', () => {
  jest.setTimeout(120000);

  test('2,000 arbitrary inputs never throw and preserve result invariants', () => {
    const arbitraryInput = fc.record({
      platform: fc.constantFrom('android', 'ios'),
      sourceApp: fc.oneof(fc.constantFrom(...sourceApps), fc.string({ maxLength: 200 })),
      title: fc.string({ maxLength: 20000 }),
      body: fc.string({ maxLength: 20000 }),
    });
    fc.assert(
      fc.property(arbitraryInput, fc.jsonValue(), (input, json) => {
        const result = parse(input, parsers, generic);
        expectValidMoney(result);
        expect(() => validateParser(json)).not.toThrow();
        expect(() => validateGeneric(json)).not.toThrow();
      }),
      { numRuns: 2000, seed: 20261025 },
    );

    for (const text of ['\0', '\uD800', '\uDFFF', 'RTL \u05D0\u05D1\u05D2', 'emoji 🔔💳']) {
      expectValidMoney(
        parse({ platform: 'android', sourceApp: sourceApps[0], title: text, body: text }, parsers, generic),
      );
    }
  });

  test('500 promo sentences never produce high-confidence money', () => {
    const templates = [
      (n: number) => `Get up to RM${n} coverage from just RM${n}/month`,
      (n: number) => `Win RM${n}!`,
      (n: number) => `cashback RM${n}`,
      (n: number) => `from just RM${n}/month`,
      (n: number) => `Dapatkan RM${n} cashback sekarang`,
      (n: number) => `Menang RM${n} dengan rakan anda!`,
    ];
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000000 }), fc.nat(), (amount, index) => {
        const sourceApp = sourceApps[index % sourceApps.length];
        const body = templates[index % templates.length](amount);
        const result = parse(
          { platform: 'android', sourceApp, title: 'Special offer', body },
          parsers,
          generic,
        );
        expect(result.confidence === 'high' && result.direction !== 'info').toBe(false);
      }),
      { numRuns: 500, seed: 20261025 },
    );
  });

  test('a 1 MB body completes under 50 ms and ignores money after the cap', () => {
    const input: ParseInput = {
      platform: 'android',
      sourceApp: 'my.com.tngdigital.ewallet',
      title: 'Transaction',
      body: `${'x'.repeat(1000000)} RM 99.00 received from ALI`,
    };
    const start = performance.now();
    const result = parse(input, parsers, generic);
    const elapsed = performance.now() - start;
    expect(result.direction).toBe('info');
    expect(result.amountMinor).toBeNull();
    expect(elapsed).toBeLessThan(50);
  });

  test('known-catastrophic regexes are rejected and accepted patterns stay fast', () => {
    const evilPatterns = [
      '(a+)+$',
      '(a|aa)+',
      '(.*a){20}',
      '([a-zA-Z]+)*',
      '(a|a?)+',
      '(a|aa)*',
      '(a|a$)+',
      '(x+x+)+y',
      '(\\w+\\s?)*',
      '(.*)*',
      '(a*)+',
      '(a+)*',
      '([a-zA-Z0-9]+)*$',
      '(a|aa)+$',
      '(a*)*',
    ];
    for (const pattern of evilPatterns) {
      expect(validateParser(parserWithMatch(pattern)).ok).toBe(false);
    }

    const pieces = [
      'RM\\s?',
      '(?<amount>[\\d,]+\\.\\d{2})',
      '.+?',
      '\\s*',
      'paid',
      'received',
      '(?:to|from)',
      '[A-Z0-9]+',
    ];
    const attackText = `${'a'.repeat(5000)}!`;
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...pieces), { minLength: 1, maxLength: 5 }), (parts) => {
        const pattern = parts.join('');
        if (!validateParser(parserWithMatch(pattern)).ok) return;
        const start = performance.now();
        new RegExp(pattern, 'i').test(attackText);
        expect(performance.now() - start).toBeLessThan(50);
      }),
      { numRuns: 300, seed: 20261025 },
    );
  });

  test('all fixtures times 20 run under 2 seconds', () => {
    const start = performance.now();
    for (let round = 0; round < 20; round += 1) {
      for (const fixture of fixtures) parse(fixture, parsers, generic);
    }
    const elapsed = performance.now() - start;
    const count = fixtures.length * 20;
    console.log(
      `Parser throughput: ${count} notifications in ${elapsed.toFixed(1)} ms; mean ${(elapsed / count).toFixed(4)} ms each`,
    );
    expect(elapsed).toBeLessThan(2000);
  });

  test('normalisation variants preserve every real amount and direction', () => {
    const variants = [
      (body: string) =>
        body.replace(/[A-Za-z0-9]/g, (character) =>
          String.fromCodePoint(character.charCodeAt(0) + 0xfee0),
        ),
      (body: string) => body.replace(/ /g, '\u00A0'),
      (body: string) => body.split('').join('\u200B'),
      (body: string) => body.replace(/'/g, '’'),
      (body: string) => body.replace(/'/g, 'â'),
    ];
    for (const fixture of realFixtures) {
      const expected = parse(fixture, parsers, generic);
      for (const variant of variants) {
        const result = parse({ ...fixture, body: variant(fixture.body) }, parsers, generic);
        expect(result.direction).toBe(expected.direction);
        expect(result.amountMinor).toBe(expected.amountMinor);
      }
    }
  });
});
