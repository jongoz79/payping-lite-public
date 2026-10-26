import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { matchingParsers, parse } from '../engine';
import type { GenericConfig, ParseInput, ParseResult, Parser } from '../engine';
import { ttsText } from '../tts';

interface Fixture extends ParseInput {
  name: string;
  synthetic?: boolean;
  real?: boolean;
  expect: Omit<ParseResult, 'currency' | 'ruleId'> & {
    ruleId?: string | null;
    currency?: string;
  };
}

const libraryDirectory = join(process.cwd(), 'parser-library');
const parserFiles = readdirSync(join(libraryDirectory, 'parsers')).filter((file) =>
  file.endsWith('.json'),
);
const parsers = parserFiles.map(
  (file) =>
    JSON.parse(readFileSync(join(libraryDirectory, 'parsers', file), 'utf8')) as Parser,
);
const generic = JSON.parse(
  readFileSync(join(libraryDirectory, 'generic.default.json'), 'utf8'),
) as GenericConfig;
const fixtureEntries = ['fixtures', 'fixtures-real'].flatMap((directory) =>
  readdirSync(join(libraryDirectory, directory))
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({ directory, file, real: directory === 'fixtures-real' })),
);

function readFixtures(directory: string, file: string): Fixture[] {
  return JSON.parse(readFileSync(join(libraryDirectory, directory, file), 'utf8')) as Fixture[];
}

describe.each(fixtureEntries)('$directory/$file', ({ directory, file, real }) => {
  const fixtures = readFixtures(directory, file);

  test.each(fixtures)('$name', (fixture) => {
    const { name: _name, synthetic: _synthetic, real: _real, expect: expected, ...input } = fixture;
    const result = parse(input, parsers, generic);
    if (real) {
      expect(result).toMatchObject({ ...expected, currency: expected.currency ?? 'MYR' });
    } else {
      const { currency, ...syntheticResult } = result;
      expect(currency).toBe('MYR');
      expect(syntheticResult).toEqual(expected);
    }
  });
});

test('every parser rule has a positive fixture', () => {
  const coveredRuleIds = new Set(
    fixtureEntries.flatMap(({ directory, file }) =>
      readFixtures(directory, file).map((fixture) => parse(fixture, parsers, generic).ruleId),
    ),
  );
  const ruleIds = parsers.flatMap((parser) => parser.rules.map((rule) => rule.id));
  for (const ruleId of ruleIds) expect(coveredRuleIds).toContain(ruleId);
});

test('matchingParsers selects Android packages and iOS app names', () => {
  const input: ParseInput = {
    platform: 'android',
    sourceApp: 'my.com.tngdigital.ewallet',
    title: '',
    body: '',
  };
  expect(matchingParsers(input, parsers).map((parser) => parser.id)).toEqual(['touchngo']);
  expect(matchingParsers({ ...input, platform: 'ios', sourceApp: 'tng ewallet' }, parsers)).toHaveLength(1);
  expect(matchingParsers({ ...input, sourceApp: 'com.unknown.app' }, parsers)).toEqual([]);
});

test('title and body are capped at 4,000 characters before matching', () => {
  const input: ParseInput = {
    platform: 'android',
    sourceApp: 'my.com.tngdigital.ewallet',
    title: `${'x'.repeat(4000)} Cash In Successful`,
    body: 'Cash In Successful',
  };
  expect(parse(input, parsers, generic).confidence).toBe('none');
  expect(
    parse(
      {
        ...input,
        title: 'Transaction',
        body: `RM 10.00 ${'x'.repeat(3990)} received from ALI`,
      },
      parsers,
      generic,
    ).confidence,
  ).toBe('none');
});

describe('ttsText', () => {
  const base: ParseResult = {
    ruleId: null,
    direction: 'in',
    amountMinor: 1250,
    currency: 'MYR',
    counterparty: 'Ali',
    confidence: 'high',
  };

  test('speaks incoming and outgoing integer amounts', () => {
    expect(ttsText(base)).toBe('Plus 12 ringgit 50 sen, Ali');
    expect(ttsText({ ...base, direction: 'out', amountMinor: 800, counterparty: 'Grab' })).toBe(
      'Minus 8 ringgit, Grab',
    );
    expect(ttsText({ ...base, counterparty: undefined })).toBe('Plus 12 ringgit 50 sen');
    expect(ttsText(base, 'ms')).toBe('Tambah 12 ringgit 50 sen, Ali');
    expect(ttsText({ ...base, direction: 'out', counterparty: 'Grab' }, 'ms')).toBe(
      'Tolak 12 ringgit 50 sen, Grab',
    );
    expect(
      ttsText({ ...base, direction: 'out', amountMinor: 79000, currency: 'JPY', counterparty: 'Grab' }),
    ).toBe('Minus 790 JPY, Grab');
  });

  test('stays silent for informational or amount-less results', () => {
    expect(ttsText({ ...base, direction: 'info' })).toBeNull();
    expect(ttsText({ ...base, amountMinor: null })).toBeNull();
  });
});
