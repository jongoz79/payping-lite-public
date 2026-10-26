import { calculateTotals } from '../totals';

test('totals count logged payments, separate in and out, and sum MYR only', () => {
  expect(
    calculateTotals([
      { status: 'logged', direction: 'in', amount_minor: 1250, currency: 'MYR' },
      { status: 'logged', direction: 'out', amount_minor: 500, currency: 'MYR' },
      { status: 'needs_review', direction: 'in', amount_minor: 99900, currency: 'MYR' },
      { status: 'ignored', direction: 'out', amount_minor: 88800, currency: 'MYR' },
      { status: 'logged', direction: 'info', amount_minor: null, currency: 'MYR' },
      { status: 'logged', direction: 'in', amount_minor: 700, currency: 'USD' },
    ]),
  ).toEqual({ paymentCount: 3, inMinor: 1250, outMinor: 500 });
});
