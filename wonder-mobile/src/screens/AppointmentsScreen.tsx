import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { theme } from '../styles/theme';

export function AppointmentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agendamentos</Text>
      <Text style={styles.subtitle}>Lista de agendamentos.</Text>

      <Card>
        <LoadingIndicator text="Carregando agendamentos..." />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
