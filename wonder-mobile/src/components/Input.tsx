import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { theme } from '../styles/theme';

type InputProps = TextInputProps & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
};

export function Input({ label, value, onChangeText, error, style, ...textInputProps }: InputProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        value={value}
        onChangeText={onChangeText}
        {...textInputProps}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
