import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { theme } from '../styles/theme';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Logo size={20} />
      <Text style={styles.title}>Categorias</Text>
      <Text style={styles.subtitle}>
        Categorias
      </Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Diego BarberShop</Text>
        <Text style={styles.cardText}>
          08:00-17:00
        </Text>
      </Card>

      <Button title="Botão" onPress={() => undefined} />
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
    lineHeight: 34,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  card: {
    marginTop: theme.spacing.sm,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 20,
  },
});
