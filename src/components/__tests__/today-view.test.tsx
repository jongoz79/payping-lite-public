import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TodayView, type TodayViewProps } from '@/components/today-view';
import type { CaptureRow } from '@/db';
import { I18nProvider } from '@/i18n';

const now = Date.now();

function capture(overrides: Partial<CaptureRow> = {}): CaptureRow {
  return {
    id: 'capture-1',
    platform: 'android',
    source_app: 'example.wallet',
    parser_id: 'example',
    title: 'Money received',
    body: 'You received RM 12.50 from Ali',
    posted_at: now,
    captured_at: now,
    dedupe_key: 'dedupe-1',
    rule_id: 'example.received.v1',
    direction: 'in',
    amount_minor: 1250,
    currency: 'MYR',
    counterparty: 'Ali',
    reference: 'REF-1',
    confidence: 'high',
    status: 'logged',
    user_note: null,
    user_edited: 0,
    synced_at: null,
    ...overrides,
  };
}

function props(overrides: Partial<TodayViewProps> = {}): TodayViewProps {
  return {
    rows: [],
    apps: [{ package: 'example.wallet', label: 'Example Wallet', iconUri: '' }],
    permission: 'granted',
    listenerConnected: true,
    selectedCount: 1,
    onEnableAccess: jest.fn(),
    onChooseApps: jest.fn(),
    onReview: jest.fn(),
    onEdit: jest.fn(),
    onCreateParser: jest.fn(),
    onReplay: jest.fn(),
    ...overrides,
  };
}

async function renderToday(overrides: Partial<TodayViewProps> = {}, language: 'en' | 'ms' = 'en') {
  const view = await render(
    <I18nProvider initialPreference={language}>
      <TodayView {...props(overrides)} />
    </I18nProvider>,
  );
  await act(async () => jest.runOnlyPendingTimers());
  return view;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Today states', () => {
  it('renders the empty state', async () => {
    const view = await renderToday();
    expect(view.getByText('No payments yet')).toBeTruthy();
    expect(view.getByText('Listening to 1 app')).toBeTruthy();
  });

  it('shows revoked notification access', async () => {
    const view = await renderToday({ permission: 'denied', listenerConnected: false });
    expect(view.getByText('Notification access is off — Tap to enable')).toBeTruthy();
  });

  it('shows the no-apps action', async () => {
    const view = await renderToday({ apps: [], selectedCount: 0 });
    expect(view.getByText('No apps selected — Tap to choose apps')).toBeTruthy();
  });

  it('shows totals, the latest payment and feed in the normal state', async () => {
    const view = await renderToday({ rows: [capture()] });
    expect(view.getAllByText(/\+RM 12\.50/).length).toBeGreaterThan(0);
    expect(view.getAllByText('Ali').length).toBeGreaterThan(0);
    expect(view.getByText('Latest confirmed payment')).toBeTruthy();
    expect(view.getByLabelText('Received 12 ringgit 50 sen from Ali')).toBeTruthy();
  });

  it('flips a signed feed row through the existing correction callback', async () => {
    const onFlip = jest.fn();
    const row = capture();
    const view = await renderToday({ rows: [row], onFlip });
    await fireEvent.press(view.getByRole('button', { name: 'Flip to OUT' }));
    expect(onFlip).toHaveBeenCalledWith(row);
  });

  it('confirms the current direction independently of flipping it', async () => {
    const onReview = jest.fn();
    const row = capture({ parser_id: null, confidence: 'low', status: 'needs_review', amount_minor: 950 });
    const view = await renderToday({ rows: [row], onReview });
    expect(view.getByText('Check unconfirmed payments (1)')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Confirm' }));
    expect(onReview).toHaveBeenNthCalledWith(1, row, 'in');
    await fireEvent.press(view.getByRole('button', { name: 'Flip to OUT' }));
    expect(onReview).toHaveBeenNthCalledWith(2, row, 'out');
    expect(view.getByRole('button', { name: 'Fix' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Ignore' })).toBeTruthy();
  });

  it('offers explicit Received and Paid actions for unsigned captures', async () => {
    const onReview = jest.fn();
    const row = capture({
      parser_id: null,
      confidence: 'none',
      status: 'needs_review',
      direction: 'info',
      amount_minor: null,
    });
    const view = await renderToday({ rows: [row], onReview });
    await fireEvent.press(view.getByRole('button', { name: 'Received' }));
    expect(onReview).toHaveBeenNthCalledWith(1, row, 'in');
    await fireEvent.press(view.getByRole('button', { name: 'Paid' }));
    expect(onReview).toHaveBeenNthCalledWith(2, row, 'out');
    expect(view.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it.each([
    { language: 'en' as const, heading: 'Check unconfirmed payments (1)' },
    { language: 'ms' as const, heading: 'Sahkan bayaran belum pasti (1)' },
  ])(
    'lets long review names and amounts wrap without clipping in $language',
    async ({ language, heading }) => {
      const view = await renderToday(
        {
          rows: [
            capture({
              counterparty: 'UNIQUE SHOP 120',
              direction: 'out',
              amount_minor: 12050,
              status: 'needs_review',
            }),
          ],
        },
        language,
      );
      expect(view.getByText(heading)).toBeTruthy();

      const name = view.getByText('UNIQUE SHOP 120');
      expect(name.props.numberOfLines).toBeUndefined();
      expect(StyleSheet.flatten(name.parent?.props.style)).toMatchObject({ flex: 1, flexBasis: 130 });

      const amount = view.getByText('−RM 120.50');
      expect(amount.props.numberOfLines).toBeUndefined();
      expect(StyleSheet.flatten(amount.props.style)).toMatchObject({ flexShrink: 1, textAlign: 'right' });
    },
  );

  it('caps a large review queue at three compact cards with a see-all action', async () => {
    const reviewRows = Array.from({ length: 5 }, (_, index) =>
      capture({
        id: `review-${index}`,
        parser_id: null,
        status: 'needs_review',
        counterparty: `Customer ${index}`,
      }),
    );
    const view = await renderToday({ rows: [capture()], reviewRows, reviewCount: 341 });
    expect(view.getAllByRole('button', { name: 'Payment check actions' })).toHaveLength(3);
    expect(view.getByText('See all 341 →')).toBeTruthy();
    expect(view.queryByText('Customer 3')).toBeNull();
    expect(view.getByText('Latest confirmed payment')).toBeTruthy();
  });

  it('shows Shortcuts readiness instead of Android permission states on iOS', async () => {
    const view = await renderToday({
      capturePlatform: 'ios',
      apps: [],
      selectedCount: 0,
      listenerConnected: false,
    });
    expect(view.getByText('Payment alerts are ready in Shortcuts')).toBeTruthy();
    expect(view.queryByText('Notification access is off — Tap to enable')).toBeNull();
    expect(view.queryByText('No apps selected — Tap to choose apps')).toBeNull();
  });
});
