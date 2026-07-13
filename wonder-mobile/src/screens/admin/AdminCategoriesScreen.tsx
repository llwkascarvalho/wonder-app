import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { listarCategoriasAdmin } from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminCategoria } from '../../types/admin';

export function AdminCategoriesScreen() {
  const [categorias, setCategorias] = useState<AdminCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setCategorias(await listarCategoriasAdmin());
    } catch {
      setError('Nao foi possivel carregar as categorias.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return <LoadingIndicator text="Carregando categorias..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
        <Text style={styles.subtitle}>Categorias cadastradas no catalogo.</Text>
      </View>

      <Card style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Manutencao indisponivel nesta branch</Text>
        <Text style={styles.noticeText}>
          O backend atual expoe apenas a listagem de categorias em /catalogo/categorias. Cadastro,
          edicao e alteracao de status nao possuem endpoint real nesta branch.
        </Text>
      </Card>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={categorias}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>Nenhuma categoria cadastrada.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.categoryCard}>
            <View style={styles.categoryImage}>
              <Text style={styles.categoryImageText}>{item.nome.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardText}>ID {item.id}</Text>
            </View>
          </Card>
        )}
      />
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
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  noticeCard: {
    gap: theme.spacing.xs,
  },
  noticeTitle: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  noticeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  categoryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  categoryImage: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  categoryImageText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  categoryInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  empty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
