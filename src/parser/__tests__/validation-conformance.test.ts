import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GenericConfig, Parser } from '../engine';
import { validateGeneric, validateParser } from '../validate';

interface ValidationFixture {
  name: string;
  kind: 'parser' | 'generic' | 'regex';
  input: unknown;
  expect: { ok: boolean; codes: string[] };
}

const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), 'parser-library', 'validation-fixtures.json'), 'utf8'),
) as ValidationFixture[];

function parserWithMatch(pattern: string): Parser {
  return {
    schemaVersion: 1,
    id: 'conformance',
    name: 'Conformance test',
    version: 1,
    androidPackages: [],
    iosAppNames: [],
    rules: [
      {
        id: 'conformance.test.v1',
        priority: 1,
        match: { title: pattern },
        direction: 'info',
      },
    ],
  };
}

test('at least 40 plausible patterns must be accepted', () => {
  expect(fixtures.filter((fixture) => fixture.expect.ok).length).toBeGreaterThanOrEqual(40);
});

test.each(fixtures)('$name', (fixture) => {
  const result =
    fixture.kind === 'parser'
      ? validateParser(fixture.input)
      : fixture.kind === 'generic'
        ? validateGeneric(fixture.input)
        : validateParser(parserWithMatch(fixture.input as string));
  expect(result.ok).toBe(fixture.expect.ok);
  if (!result.ok) {
    expect(result.errors.map((error) => error.code)).toEqual(fixture.expect.codes);
  }
});

test('JSON and regex size caps have stable codes', () => {
  const oversized = parserWithMatch('Receipt');
  oversized.description = 'x'.repeat(1000001);
  const jsonResult = validateParser(oversized);
  expect(jsonResult.ok).toBe(false);
  if (!jsonResult.ok) expect(jsonResult.errors.map((error) => error.code)).toEqual(['JSON_TOO_LARGE']);

  const regexResult = validateParser(parserWithMatch('a'.repeat(4001)));
  expect(regexResult.ok).toBe(false);
  if (!regexResult.ok) expect(regexResult.errors.map((error) => error.code)).toEqual(['REGEX_TOO_LONG']);
});

test('default generic config conforms', () => {
  const generic = JSON.parse(
    readFileSync(join(process.cwd(), 'parser-library', 'generic.default.json'), 'utf8'),
  ) as GenericConfig;
  expect(validateGeneric(generic).ok).toBe(true);
});
