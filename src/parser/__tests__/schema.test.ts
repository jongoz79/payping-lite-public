import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';

import type { GenericConfig, Parser } from '../engine';

const libraryDirectory = join(process.cwd(), 'parser-library');
const schema = JSON.parse(readFileSync(join(libraryDirectory, 'schema.json'), 'utf8')) as object;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);
const parserFiles = readdirSync(join(libraryDirectory, 'parsers')).filter((file) =>
  file.endsWith('.json'),
);
const parsers = parserFiles.map(
  (file) =>
    JSON.parse(readFileSync(join(libraryDirectory, 'parsers', file), 'utf8')) as Parser,
);

test.each(parserFiles)('%s validates against schema.json', (file) => {
  const parser = JSON.parse(readFileSync(join(libraryDirectory, 'parsers', file), 'utf8')) as unknown;
  const valid = validate(parser);
  expect(validate.errors).toBeNull();
  expect(valid).toBe(true);
});

test('rule IDs are unique and match their parser', () => {
  const ids = parsers.flatMap((parser) => parser.rules.map((rule) => rule.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const parser of parsers) {
    for (const rule of parser.rules) expect(rule.id.startsWith(`${parser.id}.`)).toBe(true);
  }
});

test('all regexes compile without lookbehind or duplicate named groups', () => {
  const patterns = parsers
    .flatMap((parser) =>
      parser.rules.flatMap((rule) => [...Object.values(rule.match), ...Object.values(rule.extract ?? {})]),
    )
    .map((extraction) => (typeof extraction === 'string' ? extraction : extraction.pattern));
  for (const pattern of patterns) {
    expect(pattern).not.toMatch(/\(\?<[=!]/);
    expect(() => new RegExp(pattern, 'i')).not.toThrow();
    const namedGroups = [...pattern.matchAll(/\(\?<([a-zA-Z][a-zA-Z0-9]*)>/g)].map((match) => match[1]);
    expect(new Set(namedGroups).size).toBe(namedGroups.length);
  }
});

test('generic regexes compile and use their required named groups', () => {
  const generic = JSON.parse(
    readFileSync(join(libraryDirectory, 'generic.default.json'), 'utf8'),
  ) as GenericConfig;
  const groups = new Map<string, string[]>([
    ['amount', generic.amountPatterns],
    ['counterparty', [...generic.counterpartyPatterns.in, ...generic.counterpartyPatterns.out]],
    ['reference', generic.referencePatterns],
  ]);
  for (const [group, patterns] of groups) {
    for (const pattern of patterns) {
      expect(pattern).not.toMatch(/\(\?<[=!]/);
      expect(pattern).toContain(`(?<${group}>`);
      expect(() => new RegExp(pattern, 'i')).not.toThrow();
    }
  }
});
