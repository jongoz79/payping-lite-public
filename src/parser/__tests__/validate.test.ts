import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { validateGeneric, validateParser } from '../validate';

const libraryDirectory = join(process.cwd(), 'parser-library');
const invalidDirectory = join(libraryDirectory, 'invalid');

function readInvalid(name: string): unknown {
  return JSON.parse(readFileSync(join(invalidDirectory, `${name}.json`), 'utf8')) as unknown;
}

test.each(['touchngo', 'mae', 'cimb', 'rhb', 'mypb', 'qrpaybiz', 'hsbc', 'google-wallet'])(
  '%s starter parser passes validation',
  (id) => {
    const parser = JSON.parse(readFileSync(join(libraryDirectory, 'parsers', `${id}.json`), 'utf8'));
    expect(validateParser(parser)).toEqual({ ok: true, parser });
  },
);

test('default generic config passes validation', () => {
  const generic = JSON.parse(readFileSync(join(libraryDirectory, 'generic.default.json'), 'utf8'));
  expect(validateGeneric(generic)).toEqual({ ok: true, generic });
});

function parserErrors(name: string): string[] {
  const result = validateParser(readInvalid(name));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected an invalid parser');
  return result.errors.map((error) => error.message);
}

test('metadata errors explain how to fix the id and version', () => {
  const errors = parserErrors('invalid-metadata');
  expect(errors).toContain("The id 'Touch NGo' can only use lowercase letters, numbers, - and _");
  expect(errors).toContain('The schemaVersion must be 1.');
  expect(errors).toContain('The version must be a whole number of 1 or more.');
});

test('regex errors name the rule and describe the problem', () => {
  const errors = parserErrors('invalid-regex');
  expect(errors).toContain(
    'Rule 1 (touchngo.cashin-dup.v1): the title match pattern uses lookbehind, which PayPing parsers do not support.',
  );
  expect(errors).toContain(
    'Rule 2 (touchngo.received.v1): the amount pattern needs a named group (?<amount>…)',
  );
  expect(errors).toContain(
    'Rule 2 (touchngo.received.v1): the title match pattern is not valid. Check its brackets, parentheses and escape characters.',
  );
  expect(errors).toContain(
    'Rule 2 (touchngo.received.v1): the counterparty pattern is not valid. Check its brackets, parentheses and escape characters.',
  );
});

test('nested quantifiers have a plain freezing warning', () => {
  const errors = parserErrors('invalid-nested');
  expect(errors).toContain(
    'Rule 1: the title match pattern repeats a repeating part (like (a+)+). This can freeze the app. Simplify it.',
  );
  expect(errors).toContain(
    'Rule 2: the body match pattern repeats a repeating part (like (a+)+). This can freeze the app. Simplify it.',
  );
  expect(errors).toContain(
    'Rule 3: the amount pattern repeats a repeating part (like (a+)+). This can freeze the app. Simplify it.',
  );
});

test('generic validation covers named groups, portability, compilation and keywords', () => {
  const result = validateGeneric(readInvalid('invalid-generic'));
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected an invalid generic config');
  expect(result.errors.map((error) => error.message)).toContain('Amount pattern 1 needs a named group (?<amount>…)');
  expect(result.errors.map((error) => error.message)).toContain(
    'Amount pattern 2 uses lookbehind, which PayPing parsers do not support.',
  );
  expect(result.errors.map((error) => error.message)).toContain(
    'Amount pattern 3 is not valid. Check its brackets, parentheses and escape characters.',
  );
  expect(result.errors.map((error) => error.message)).toContain(
    'Amount pattern 4 repeats a repeating part (like (a+)+). This can freeze the app. Simplify it.',
  );
  expect(result.errors.map((error) => error.message)).toContain(
    'Incoming counterparty pattern 1 needs a named group (?<counterparty>…)',
  );
  expect(result.errors.map((error) => error.message)).toContain('Debit keyword 2 must be non-empty text.');
});

test('non-object input has a readable error', () => {
  expect(validateParser(null)).toEqual({
    ok: false,
    errors: [
      {
        code: 'PARSER_NOT_OBJECT',
        message: 'The parser must be a JSON object containing parser details and rules.',
      },
    ],
  });
  expect(validateGeneric('not json')).toEqual({
    ok: false,
    errors: [
      { code: 'GENERIC_NOT_OBJECT', message: 'The generic parser config must be a JSON object.' },
    ],
  });
});
