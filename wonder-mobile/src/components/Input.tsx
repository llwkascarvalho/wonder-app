import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { theme } from '../styles/theme';
import { customerTheme } from '../styles/customerTheme';

type InputProps = TextInputProps & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  appearance?: 'default' | 'customer';
};

export function Input({ label, value, onChangeText, error, appearance = 'default', style, ...textInputProps }: InputProps) {
  const customer = appearance === 'customer';
  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, customer && styles.customerLabel]}>{label}</Text> : null}

      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          customer && styles.customerInput,
          textInputProps.multiline ? styles.multiline : null,
          error ? styles.inputError : null,
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        {...textInputProps}
      />

      {error ? <Text style={[styles.error, customer && styles.customerError]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
    minWidth: 0,
    maxWidth: '100%',
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    minHeight: 48,
    minWidth: 0,
    maxWidth: '100%',
    paddingHorizontal: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  multiline: {
    minHeight: 112,
    paddingTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    textAlignVertical: 'top',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  customerLabel: {
    color: customerTheme.v4.text,
    fontFamily: customerTheme.v4.fontBodySemi,
    fontSize: 15,
  },
  customerInput: {
    alignSelf: 'stretch',
    backgroundColor: customerTheme.v4.field,
    borderColor: 'transparent',
    borderRadius: 16,
    color: customerTheme.v4.text,
    fontFamily: customerTheme.v4.fontBody,
    fontSize: 16,
    minHeight: 56,
    minWidth: 0,
  },
  customerError: {
    color: customerTheme.v4.danger,
    fontFamily: customerTheme.v4.fontBody,
    fontSize: 14,
    lineHeight: 20,
  },
});
