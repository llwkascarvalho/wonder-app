import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { theme } from '../styles/theme';
import { customerTheme } from '../styles/customerTheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  appearance?: 'default' | 'customer';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  appearance = 'default',
  style,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        appearance === 'customer' && styles.customerButton,
        appearance === 'customer' && variant === 'secondary' && styles.customerSecondary,
        appearance === 'customer' && variant === 'outline' && styles.customerOutline,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? theme.colors.primary : variant === 'danger' ? theme.colors.danger : theme.colors.white}
        />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], appearance === 'customer' && styles.customerText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: theme.borderRadius.pill,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  outline: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: theme.colors.dangerSurface,
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
  },
  lg: {
    minHeight: 56,
    paddingHorizontal: theme.spacing.xl,
  },
  text: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondaryText: {
    color: theme.colors.primary,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  dangerText: {
    color: theme.colors.danger,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.56,
  },
  customerButton: { minHeight: 52, borderRadius: 28 },
  customerSecondary: { backgroundColor: customerTheme.v4.lilac },
  customerOutline: { borderColor: customerTheme.v4.primary },
  customerText: { fontFamily: customerTheme.v4.fontBodyBold, fontSize: 15 },
});
