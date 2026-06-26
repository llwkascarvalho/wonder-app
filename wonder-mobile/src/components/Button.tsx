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

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
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
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : theme.colors.white} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{title}</Text>
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
    backgroundColor: theme.colors.error,
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
    color: theme.colors.white,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.56,
  },
});
