import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { listarAuditoriaAdmin, obterResumoAuditoriaAdmin } from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminLogAuditoria, AdminResumoAuditoria } from '../../types/admin';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR');
}

export function AdminAuditScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<AdminLogAuditoria[]>([]);
  const [resumo, setResumo] = useState<AdminResumoAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextLogs, nextResumo] = await Promise.all([
        listarAuditoriaAdmin(50),
        obterResumoAuditoriaAdmin(),
      ]);
      setLogs(nextLogs);
      setResumo(nextResumo);
    } catch {
      setError('Nao foi possivel carregar a auditoria.');
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
    return <LoadingIndicator text="Carregando auditoria..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Button title="Voltar" size="sm" variant="secondary" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Auditoria</Text>
      </View>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        {resumo.length ? (
          resumo.map((item) => (
            <View key={`${item.banco}-${item.operacao}`} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{item.banco} | {item.operacao}</Text>
              <Text style={styles.summaryValue}>{item.total}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Nenhum resumo retornado.</Text>
        )}
      </Card>

      <Text style={styles.subtitle}>Logs recentes</Text>
      {logs.length ? (
        logs.map((log) => (
          <Card key={`${log.banco}-${log.id}`} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.operation}>{log.operacao}</Text>
              <Text style={styles.dateText}>{formatDate(log.data_hora)}</Text>
            </View>
            <Text style={styles.cardTitle}>{log.tabela_afetada}</Text>
            <Text style={styles.cardText}>Banco: {log.banco}</Text>
            <Text style={styles.cardText}>Usuario: {log.usuario_id ?? '-'}</Text>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>Nenhum log retornado.</Text>
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
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  sectionCard: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  summaryLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  summaryValue: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  logCard: {
    gap: theme.spacing.xs,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  operation: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
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
    fontSize: theme.fontSize.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
