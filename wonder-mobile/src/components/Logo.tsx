import { StyleSheet, Text, TextStyle } from 'react-native';

import { theme } from '../styles/theme';

type LogoProps = {
  size?: number;
  color?: string;
  style?: TextStyle;
};

export function Logo({ size = 28, color = theme.colors.primary, style }: LogoProps) {
  return (
    <Text style={[styles.logo, { color, fontSize: size, lineHeight: size + 4 }, style]}>
      WONDER
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: 'Gruppo',
    letterSpacing: 1.5,
  },
});