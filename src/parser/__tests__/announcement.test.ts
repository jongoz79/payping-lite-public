import fixtures from '../../../parser-library/tts-fixtures.json';
import type { ParseResult } from '../engine';
import { ttsText } from '../tts';

test.each(fixtures)('announcement $language $expected', ({ result, language, app, template, expected }) => {
  expect(
    ttsText(
      { ...result, reference: result.reference ?? undefined } as ParseResult,
      language as 'en' | 'ms',
      app,
      template === undefined ? undefined : { in: template, out: template },
    ),
  ).toBe(expected);
});
