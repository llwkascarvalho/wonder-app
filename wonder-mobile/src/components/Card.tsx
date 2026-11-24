import { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '../styles/theme';
import { customerTheme } from '../styles/customerTheme';

type CardProps = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  appearance?: 'default' | 'customer';
}>;

export function Card({ children, onPress, style, appearance = 'default' }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, appearance === 'customer' && styles.customerCard, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, appearance === 'customer' && styles.customerCard, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  customerCard: {
    backgroundColor: customerTheme.v4.surface,
    borderWidth: 0,
    borderRadius: 24,
    padding: 16,
    ...customerTheme.shadow,
  },
  pressed: {
    opacity: 0.88,
  },
});
