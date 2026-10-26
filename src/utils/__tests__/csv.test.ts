import { CAPTURE_CSV_HEADERS, capturesToCsv } from '../csv';

const capture = {
  id: 'capture-1',
  platform: 'android',
  source_app: 'com.example.bank',
  parser_id: null,
  title: 'Payment, "approved"',
  body: 'Line one\nLine "two", ok',
  posted_at: 1700000000000,
  captured_at: 1700000001000,
  dedupe_key: 'dedupe-1',
  rule_id: 'example.paid.v1',
  direction: 'out',
  amount_minor: 123456,
  currency: 'MYR',
  counterparty: 'Ali',
  reference: null,
  confidence: 'high',
  status: 'logged',
  user_note: null,
  user_edited: 0,
  synced_at: null,
};

test('capture CSV has stable complete headers, escaped fields, and sen formatted as RM', () => {
  const expected = `${CAPTURE_CSV_HEADERS.join(',')}\r\ncapture-1,android,com.example.bank,,"Payment, ""approved""","Line one\nLine ""two"", ok",1700000000000,1700000001000,dedupe-1,example.paid.v1,out,1234.56,MYR,Ali,,high,logged,,0,`;

  expect(capturesToCsv(capture)).toBe(expected);
  expect(capturesToCsv([capture])).toBe(expected);
});
