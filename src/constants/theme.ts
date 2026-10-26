import { Platform } from 'react-native';

export const Colors = {
  light: {
    canvas: '#F4F4EF',
    surface: '#FFFFFF',
    subtle: '#E9EAE3',
    ink: '#151714',
    muted: '#5E625A',
    line: '#D7D9D0',
    in: '#087553',
    out: '#B3261E',
    accent: '#D9FF57',
    accentPrimary: '#D9FF57',
    accentInk: '#1A2108',
    navigationActive: '#151714',
    focus: '#2764D8',
    counter: '#171A16',
    counterText: '#F7F8F2',
    counterMuted: '#BDC3B5',
    counterSpoken: '#D3D8CB',
    counterLine: '#3A3F35',
    text: '#151714',
    background: '#F4F4EF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E9EAE3',
    textSecondary: '#5E625A',
    textTertiary: '#5E625A',
    border: '#D7D9D0',
    moneyIn: '#087553',
    moneyOut: '#B3261E',
    danger: '#B3261E',
    onAccent: '#1A2108',
  },
  dark: {
    canvas: '#11130F',
    surface: '#1C1F19',
    subtle: '#292D24',
    ink: '#F3F5ED',
    muted: '#ADB4A4',
    line: '#383D32',
    in: '#70E5B4',
    out: '#FF9A91',
    accent: '#D9FF57',
    accentPrimary: '#D9FF57',
    accentInk: '#1A2108',
    navigationActive: '#F3F5ED',
    focus: '#8CB6FF',
    counter: '#20251B',
    counterText: '#F3F5ED',
    counterMuted: '#BDC3B5',
    counterSpoken: '#D3D8CB',
    counterLine: '#4A5141',
    text: '#F3F5ED',
    background: '#11130F',
    backgroundElement: '#1C1F19',
    backgroundSelected: '#292D24',
    textSecondary: '#ADB4A4',
    textTertiary: '#ADB4A4',
    border: '#383D32',
    moneyIn: '#70E5B4',
    moneyOut: '#FF9A91',
    danger: '#FF9A91',
    onAccent: '#1A2108',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'Manrope', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'Manrope', serif: 'serif', rounded: 'Manrope', mono: 'monospace' },
  web: {
    sans: 'Manrope',
    serif: 'var(--font-serif)',
    rounded: 'Manrope',
    mono: 'var(--font-mono)',
  },
});

export const Type = {
  latestAmount: { fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -1.04 },
  detailAmount: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -0.8 },
  screenTitle: { fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.24 },
  payee: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  row: { fontSize: 14, lineHeight: 20 },
  metadata: { fontSize: 12, lineHeight: 17 },
  overline: { fontSize: 12, lineHeight: 17, fontWeight: '800', letterSpacing: 0.96 },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 10,
  three: 12,
  threeHalf: 14,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
} as const;

export const Radius = { small: 12, medium: 16, large: 24 } as const;
export const MaxContentWidth = 800;
