import { formatAmount, formatSpokenAmount } from '../format';

describe('formatAmount', () => {
  it('uses a true minus for outgoing money', () => {
    expect(formatAmount(-1250, 'MYR', 'out')).toBe('−RM 12.50');
  });
});

describe('formatSpokenAmount', () => {
  it.each([
    [1250, '12 ringgit 50 sen'],
    [1200, '12 ringgit'],
    [50, '50 cents'],
    [0, '0 ringgit'],
    [-1250, '12 ringgit 50 sen'],
  ])('formats MYR for English screen readers and TTS: %s', (minor, expected) => {
    expect(formatSpokenAmount(minor, 'MYR', 'en')).toBe(expected);
  });

  it('formats Malay ringgit and sen naturally', () => {
    expect(formatSpokenAmount(1250, 'MYR', 'ms')).toBe('12 ringgit 50 sen');
    expect(formatSpokenAmount(50, 'MYR', 'ms')).toBe('50 sen');
    expect(formatSpokenAmount(1200, 'MYR', 'ms')).toBe('12 ringgit');
  });

  it('keeps non-MYR currency codes and handles null', () => {
    expect(formatSpokenAmount(79000, 'JPY')).toBe('790 JPY');
    expect(formatSpokenAmount(1250, 'USD')).toBe('12.50 USD');
    expect(formatSpokenAmount(null)).toBe('');
  });
});
