import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { AdminProvidersStackParamList } from '../../navigation/AdminProvidersStack';
import { listarPrestadoresPendentes } from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminPrestador } from '../../types/admin';
import { formatBackendDateTime } from '../../utils/dateTime';

type Navigation = NativeStackNavigationProp<AdminProvidersStackParamList, 'AdminProvidersList'>;

function formatDate(value?: string | null): string {
  return formatBackendDateTime(value, 'Sem data de envio', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminProvidersScreen() {
  const navigation = useNavigation<Navigation>();
  const [prestadores, setPrestadores] = useState<AdminPrestador[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPrestadores(await listarPrestadoresPendentes());
    } catch {
      setError('Nao foi possivel carregar as solicitacoes pendentes.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return <LoadingIndicator text="Carregando solicitacoes..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prestadores</Text>
        <Text style={styles.subtitle}>Solicitacoes pendentes de aprovacao.</Text>
      </View>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={prestadores}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Card>
            <Text style={styles.empty}>Nenhuma solicitacao pendente.</Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={styles.providerCard}>
            <CatalogImage
              fotoUrl={item.foto_url || item.solicitante_foto_url}
              kind="provider"
              style={styles.providerAvatar}
            />
            <View style={styles.providerInfo}>
              <Text style={styles.cardTitle}>{item.nome_estab}</Text>
              <Text style={styles.cardText}>Documento: {item.documento}</Text>
              <Text style={styles.cardText}>Enviado: {formatDate(item.enviado_em)}</Text>
            </View>
            <Button
              title="Visualizar"
              size="sm"
              variant="outline"
              onPress={() => navigation.navigate('AdminProviderDetails', { prestadorId: item.id })}
            />
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
  list: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  providerCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  providerAvatar: {
    borderRadius: theme.borderRadius.md,
    height: 56,
    width: 56,
  },
  providerInfo: {
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
