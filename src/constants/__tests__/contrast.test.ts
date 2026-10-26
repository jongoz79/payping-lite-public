import { Colors } from '../theme';

function luminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('colour tokens', () => {
  it.each(['light', 'dark'] as const)('%s text and functional colours meet WCAG AA', (scheme) => {
    const colors = Colors[scheme];
    const pairs = [
      [colors.text, colors.background],
      [colors.text, colors.backgroundElement],
      [colors.textSecondary, colors.background],
      [colors.textSecondary, colors.backgroundElement],
      [colors.textTertiary, colors.backgroundSelected],
      [colors.moneyIn, colors.background],
      [colors.moneyIn, colors.backgroundElement],
      [colors.moneyOut, colors.background],
      [colors.moneyOut, colors.backgroundElement],
      [colors.navigationActive, colors.background],
      [colors.accentInk, colors.accentPrimary],
      [colors.danger, colors.backgroundElement],
      [colors.counterText, colors.counter],
      [colors.counterMuted, colors.counter],
      [colors.counterSpoken, colors.counter],
      [colors.accentPrimary, colors.counter],
    ];
    for (const [foreground, background] of pairs) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
