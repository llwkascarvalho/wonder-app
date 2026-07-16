import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminIcon, AdminIconName } from '../../components/admin/AdminIcon';
import { Card } from '../../components/Card';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { AdminHomeStackParamList, AdminTabsParamList } from '../../navigation/AdminTabs';
import { listarPrestadoresPendentes } from '../../services/admin';
import { theme } from '../../styles/theme';

type HomeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<AdminHomeStackParamList, 'AdminHomeHub'>,
  BottomTabNavigationProp<AdminTabsParamList>
>;

export function AdminHomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const [pendentes, setPendentes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const nextPendentes = await listarPrestadoresPendentes();
      setPendentes(nextPendentes.length);
    } catch {
      setError('Nao foi possivel carregar os dados administrativos.');
      setPendentes(null);
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
    return <LoadingIndicator text="Carregando admin..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.subtitle}>Acompanhe os fluxos administrativos do Wonder.</Text>
      </View>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <Card style={styles.hubCard} onPress={() => navigation.navigate('AdminProviders')}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Prestadores pendentes</Text>
          <Text style={styles.cardText}>Solicitacoes aguardando analise.</Text>
          {pendentes !== null ? <Text style={styles.cardText}>Pendentes: {pendentes}</Text> : null}
        </View>
        <IconCircle name="groups" />
      </Card>

      <Card style={styles.hubCard} onPress={() => navigation.navigate('AdminCategories')}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Categorias</Text>
          <Text style={styles.cardText}>Consulte as categorias cadastradas.</Text>
        </View>
        <IconCircle name="category" />
      </Card>

      <Card style={styles.hubCard} onPress={() => navigation.navigate('AdminMonitoring')}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Observabilidade</Text>
          <Text style={styles.cardText}>Auditoria, saude dos bancos, consultas custosas e alertas.</Text>
        </View>
        <IconCircle name="monitor" />
      </Card>

      <Card style={styles.hubCard} onPress={() => navigation.navigate('AdminAudit')}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Auditoria</Text>
          <Text style={styles.cardText}>Logs recentes e resumo por operacao.</Text>
        </View>
        <IconCircle name="fact-check" />
      </Card>
    </ScrollView>
  );
}

function IconCircle({ name }: { name: AdminIconName }) {
  return (
    <View style={styles.iconCircle}>
      <AdminIcon name={name} color={theme.colors.white} size={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  hubCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
