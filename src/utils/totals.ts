export interface PaymentTotalRow {
  status: string;
  direction: string;
  amount_minor: number | null;
  currency: string;
}

export interface PaymentTotals {
  paymentCount: number;
  inMinor: number;
  outMinor: number;
}

export function calculateTotals(rows: PaymentTotalRow[]): PaymentTotals {
  const totals: PaymentTotals = { paymentCount: 0, inMinor: 0, outMinor: 0 };

  for (const row of rows) {
    if (row.status !== 'logged' || (row.direction !== 'in' && row.direction !== 'out')) continue;
    totals.paymentCount += 1;
    if (row.currency !== 'MYR' || row.amount_minor === null) continue;
    if (row.direction === 'in') totals.inMinor += row.amount_minor;
    else totals.outMinor += row.amount_minor;
  }

  return totals;
}
