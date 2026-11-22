import { Platform } from 'react-native';

export const customerTheme = {
  v4: {
    bg: '#F6F3FA', surface: '#FFFFFF', field: '#EFEAF6', primary: '#5D14A6',
    primaryDeep: '#2E0A57', violet: '#8100FF', lilac: '#EFE3FA',
    text: '#24102E', textMuted: '#675B75', border: '#E7E0EF',
    success: '#12805C', danger: '#C62828', star: '#F5A623',
    shadowCard: '0 6px 20px rgba(46,10,87,.08)',
    shadowNav: '0 10px 28px rgba(46,10,87,.18)',
    shadowButton: '0 8px 16px rgba(93,20,166,.32)',
    fontDisplay: 'BricolageGrotesque_800ExtraBold',
    fontBody: 'Figtree_400Regular',
    fontBodySemi: 'Figtree_600SemiBold',
    fontBodyBold: 'Figtree_700Bold',
  },
  typography: {
    // San Francisco on Apple platforms/web; system fallback keeps the same metrics elsewhere.
    body: Platform?.OS === 'web'
      ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif'
      : 'System',
  },
  colors: {
    brand: '#7324E3',
    brandDark: '#481793',
    background: '#F7F2EA',
    surface: '#FFFFFF',
    text: '#24102F',
    textSecondary: '#6D6275',
    textOnBrand: '#FFFFFF',
    dangerSurface: '#FDE3E5',
    danger: '#C62828',
    skeleton: '#EEE6D8',
  },
  radius: {
    card: 22,
    image: 20,
    input: 18,
    pill: 999,
  },
  shadow: Platform?.OS === 'web'
    ? {
      boxShadow: '0 1px 3px rgba(36,16,46,0.05), 0 6px 20px rgba(36,16,46,0.08)',
    }
    : {
      elevation: 3,
      shadowColor: '#24102E',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
} as const;
