export const theme = {
  colors: {
    primary: '#5D14A6',
    primaryDark: '#3F0C78',
    primaryLight: '#8A35F2',

    background: '#FFFFFF',
    backgroundSoft: '#F7F7F7',

    surface: '#FFFFFF',
    surfaceMuted: '#F3F3F3',

    text: '#111111',
    textSecondary: '#666666',
    textMuted: '#999999',

    border: '#E5E5E5',

    success: '#16A34A',
    error: '#DC2626',
    warning: '#F59E0B',

    white: '#FFFFFF',
    black: '#000000',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    pill: 999,
  },
} as const;

export type Theme = typeof theme;
