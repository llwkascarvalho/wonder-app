import { Platform } from 'react-native';

export const customerTheme = {
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
