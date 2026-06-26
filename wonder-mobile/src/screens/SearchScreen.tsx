import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { theme } from '../styles/theme';

export function SearchScreen() {
  const [search, setSearch] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscar</Text>
      <Text style={styles.subtitle}>Procurar por serviços ou estabelecimentos</Text>

      <Input
        label="Serviço ou estabelecimento"
        placeholder="Ex.: corte, manicure, salão"
        value={search}
        onChangeText={setSearch}
      />

      <Card>
        <Text style={styles.cardTitle}>Resultados</Text>
        <Text style={styles.cardText}>
          Nenhum resultado encontrado.
        </Text>
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
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xs,
  },
});
