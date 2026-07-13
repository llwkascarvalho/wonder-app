import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { obterMonitoramentoAdmin } from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminMonitoramentoBanco } from '../../types/admin';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

export function AdminMonitoringScreen() {
  const [bancos, setBancos] = useState<AdminMonitoramentoBanco[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setBancos(await obterMonitoramentoAdmin(10));
    } catch {
      setError('Nao foi possivel carregar o monitoramento.');
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
    return <LoadingIndicator text="Carregando monitoramento..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Monitoramento</Text>
        <Text style={styles.subtitle}>Consultas lentas, conexoes ativas e dead tuples por banco.</Text>
      </View>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {bancos.length ? (
        bancos.map((banco) => (
          <Card key={banco.banco} style={styles.bankCard}>
            <View style={styles.bankHeader}>
              <Text style={styles.bankTitle}>{banco.banco}</Text>
              {banco.erro ? <Text style={styles.errorBadge}>Erro</Text> : null}
            </View>

            {banco.erro ? <Text style={styles.error}>Falha ao consultar: {banco.erro}</Text> : null}

            <Text style={styles.sectionTitle}>Queries mais lentas</Text>
            {banco.queries_lentas.length ? (
              banco.queries_lentas.slice(0, 3).map((query, index) => (
                <View key={`${banco.banco}-query-${index}`} style={styles.itemBox}>
                  <Text style={styles.itemTitle}>{formatNumber(query.mean_exec_time)} ms media</Text>
                  <Text style={styles.itemText}>Chamadas: {query.calls} | Linhas: {query.rows}</Text>
                  <Text style={styles.queryText} numberOfLines={3}>{query.query}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Nenhuma query lenta retornada.</Text>
            )}

            <Text style={styles.sectionTitle}>Conexoes ativas</Text>
            {banco.conexoes_ativas.length ? (
              banco.conexoes_ativas.slice(0, 3).map((conexao) => (
                <View key={`${banco.banco}-conn-${conexao.pid}`} style={styles.itemBox}>
                  <Text style={styles.itemTitle}>PID {conexao.pid}</Text>
                  <Text style={styles.itemText}>
                    {conexao.usuario || '-'} | {conexao.estado || '-'} | {formatNumber(conexao.duracao_segundos || 0)}s
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Nenhuma conexao ativa retornada.</Text>
            )}

            <Text style={styles.sectionTitle}>Dead tuples</Text>
            {banco.tabelas_dead_tuples.length ? (
              banco.tabelas_dead_tuples.slice(0, 3).map((tabela) => (
                <View key={`${banco.banco}-dead-${tabela.schema_name}-${tabela.tabela}`} style={styles.itemBox}>
                  <Text style={styles.itemTitle}>{tabela.schema_name}.{tabela.tabela}</Text>
                  <Text style={styles.itemText}>
                    Live: {tabela.live_tuples} | Dead: {tabela.dead_tuples}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>Nenhuma tabela retornada.</Text>
            )}
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>Nenhum dado de monitoramento retornado.</Text>
        </Card>
      )}
    </ScrollView>
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
    lineHeight: 22,
  },
  bankCard: {
    gap: theme.spacing.sm,
  },
  bankHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  itemBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  itemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  queryText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    lineHeight: 16,
  },
  errorBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  empty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
