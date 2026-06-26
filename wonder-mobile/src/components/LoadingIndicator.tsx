import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { theme } from '../styles/theme';

type LoadingIndicatorProps = {
  text?: string;
};

export function LoadingIndicator({ text }: LoadingIndicatorProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
