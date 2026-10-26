import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ParserLiveTest } from '@/components/parser-live-test';
import { ParserWizard } from '@/components/parser-wizard';
import type { CaptureRow } from '@/db';
import { I18nProvider } from '@/i18n';
import { en } from '@/i18n/en';
import { parsePreview } from '@/native/capture';
import type { CaptureParseResult } from '@/native/capture';

jest.mock('@/db', () => ({ saveParser: jest.fn() }));
jest.mock('@/native/capture', () => ({ parsePreview: jest.fn(), reparse: jest.fn() }));

const mockParsePreview = jest.mocked(parsePreview);

const success: CaptureParseResult = {
  ruleId: 'example.received.v1',
  parserId: 'example',
  direction: 'in',
  amountMinor: 1250,
  currency: 'MYR',
  counterparty: 'Ali',
  reference: null,
  confidence: 'high',
};

function capture(overrides: Partial<CaptureRow> = {}): CaptureRow {
  return {
    id: 'capture-1',
    platform: 'android',
    source_app: 'example.wallet',
    parser_id: 'example',
    title: 'Money received',
    body: 'RM 12.50 Ali',
    posted_at: 1,
    captured_at: 1,
    dedupe_key: 'dedupe-1',
    rule_id: 'example.received.v1',
    direction: 'in',
    amount_minor: 1250,
    currency: 'MYR',
    counterparty: 'Ali',
    reference: null,
    confidence: 'high',
    status: 'logged',
    user_note: null,
    user_edited: 0,
    synced_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParsePreview.mockReturnValue({ ...success, ruleId: null });
});

test('wizard tokens keep non-overlapping 48 dp targets and expose their selected fields', async () => {
  mockParsePreview.mockReturnValue(success);
  const view = await render(
    <I18nProvider initialPreference="en">
      <ParserWizard capture={capture()} />
    </I18nProvider>,
  );

  const shortToken = view.getByRole('button', { name: 'RM' });
  expect(StyleSheet.flatten(shortToken.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
  expect(shortToken.props.hitSlop).toBeUndefined();
  expect(view.getByText('close-circle-outline')).toBeTruthy();

  await fireEvent.press(view.getByRole('button', { name: '12.50' }));
  const amountLabel = en['parsers.amountField'];
  const amountToken = view.getByRole('button', { name: `12.50, ${amountLabel}` });
  expect(amountToken.props.accessibilityState).toEqual({ selected: true });
  expect(within(amountToken).getByText(new RegExp(amountLabel))).toBeTruthy();

  await fireEvent.press(view.getByRole('button', { name: 'Ali' }));
  const counterpartyLabel = en['parsers.counterpartyField'];
  const counterpartyToken = view.getByRole('button', { name: `Ali, ${counterpartyLabel}` });
  expect(counterpartyToken.props.accessibilityState).toEqual({ selected: true });
  expect(within(counterpartyToken).getByText(new RegExp(counterpartyLabel))).toBeTruthy();
  expect(view.getByText('check-circle')).toBeTruthy();
  expect(view.getByText('Match found')).toBeTruthy();
});

test('live test shows an explicit failure icon with its text', async () => {
  const view = await render(
    <I18nProvider initialPreference="en">
      <ParserLiveTest parserJson="{}" captures={[capture()]} />
    </I18nProvider>,
  );

  expect(view.getByText('close-circle-outline')).toBeTruthy();
  expect(view.getByText('No match found')).toBeTruthy();
});

test('live test shows an explicit success icon with its text', async () => {
  mockParsePreview.mockReturnValue(success);
  const view = await render(
    <I18nProvider initialPreference="en">
      <ParserLiveTest parserJson="{}" captures={[capture()]} />
    </I18nProvider>,
  );

  expect(view.getByText('check-circle')).toBeTruthy();
  expect(view.getByText('Match found')).toBeTruthy();
});
