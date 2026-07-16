import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import {
  listarAuditoriaAdmin,
  obterMonitoramentoAdmin,
  obterResumoAuditoriaAdmin,
} from '../../services/admin';
import { theme } from '../../styles/theme';
import {
  AdminLogAuditoria,
  AdminMonitoramentoBanco,
  AdminQueryLenta,
  AdminResumoAuditoria,
} from '../../types/admin';
import { formatBackendDateTime } from '../../utils/dateTime';

type StatusLevel = 'healthy' | 'warning' | 'critical' | 'info';

type QueryComBanco = AdminQueryLenta & {
  banco: string;
};

type AlertItem = {
  id: string;
  banco: string;
  nivel: Exclude<StatusLevel, 'healthy'>;
  titulo: string;
  descricao: string;
};

const OPERATION_META: Record<string, { label: string; action: string; color: string }> = {
  INSERT: { label: 'Criacao', action: 'criou registro', color: theme.colors.success },
  UPDATE: { label: 'Atualizacao', action: 'atualizou registro', color: theme.colors.warning },
  DELETE: { label: 'Exclusao', action: 'removeu registro', color: theme.colors.error },
  SELECT: { label: 'Consulta', action: 'consultou dados', color: theme.colors.primary },
};

const ALL_FILTER = 'Todos';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

function normalizeQuery(query: string): string {
  const cleaned = query.replace(/\s+/g, ' ').trim();
  return cleaned.length > 140 ? `${cleaned.slice(0, 140)}...` : cleaned;
}

function sumDeadTuples(banco: AdminMonitoramentoBanco): number {
  return banco.tabelas_dead_tuples.reduce((total, tabela) => total + tabela.dead_tuples, 0);
}

function getStatusColor(status: StatusLevel): string {
  if (status === 'healthy') {
    return theme.colors.success;
  }
  if (status === 'warning') {
    return theme.colors.warning;
  }
  if (status === 'critical') {
    return theme.colors.error;
  }
  return theme.colors.textMuted;
}

function getBankStatus(banco: AdminMonitoramentoBanco): StatusLevel {
  if (banco.erro) {
    return 'critical';
  }

  const activeConnections = banco.conexoes_ativas.length;
  const maxMeanTime = Math.max(0, ...banco.queries_lentas.map((query) => query.mean_exec_time));
  const maxDeadTuples = Math.max(0, ...banco.tabelas_dead_tuples.map((tabela) => tabela.dead_tuples));
  const hasLongWait = banco.conexoes_ativas.some(
    (conexao) => Boolean(conexao.wait_event_type) && (conexao.duracao_segundos ?? 0) >= 30,
  );

  if (maxMeanTime >= 1000 || maxDeadTuples >= 10000 || hasLongWait) {
    return 'critical';
  }

  if (activeConnections >= 5 || maxMeanTime >= 300 || maxDeadTuples >= 1000) {
    return 'warning';
  }

  return 'healthy';
}

function getStatusLabel(status: StatusLevel): string {
  if (status === 'healthy') {
    return 'Saudavel';
  }
  if (status === 'warning') {
    return 'Atencao';
  }
  if (status === 'critical') {
    return 'Critico';
  }
  return 'Informativo';
}

function buildAlerts(bancos: AdminMonitoramentoBanco[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  bancos.forEach((banco) => {
    if (banco.erro) {
      alerts.push({
        id: `${banco.banco}-erro`,
        banco: banco.banco,
        nivel: 'critical',
        titulo: 'Falha ao consultar banco',
        descricao: `O banco ${banco.banco} retornou erro tecnico: ${banco.erro}.`,
      });
    }

    if (banco.conexoes_ativas.length >= 5) {
      alerts.push({
        id: `${banco.banco}-conexoes`,
        banco: banco.banco,
        nivel: 'warning',
        titulo: 'Muitas conexoes ativas',
        descricao: `${banco.conexoes_ativas.length} conexoes ativas foram encontradas.`,
      });
    }

    banco.conexoes_ativas.forEach((conexao) => {
      if (conexao.wait_event_type && (conexao.duracao_segundos ?? 0) >= 30) {
        alerts.push({
          id: `${banco.banco}-wait-${conexao.pid}`,
          banco: banco.banco,
          nivel: 'critical',
          titulo: 'Espera ou lock prolongado',
          descricao: `PID ${conexao.pid} aguarda ${conexao.wait_event_type} ha ${formatNumber(
            conexao.duracao_segundos ?? 0,
          )}s.`,
        });
      }
    });

    banco.tabelas_dead_tuples.forEach((tabela) => {
      if (tabela.dead_tuples >= 10000) {
        alerts.push({
          id: `${banco.banco}-dead-critical-${tabela.schema_name}-${tabela.tabela}`,
          banco: banco.banco,
          nivel: 'critical',
          titulo: 'Dead tuples elevados',
          descricao: `${tabela.schema_name}.${tabela.tabela} possui ${tabela.dead_tuples} dead tuples.`,
        });
      } else if (tabela.dead_tuples >= 1000) {
        alerts.push({
          id: `${banco.banco}-dead-warning-${tabela.schema_name}-${tabela.tabela}`,
          banco: banco.banco,
          nivel: 'warning',
          titulo: 'Dead tuples em atencao',
          descricao: `${tabela.schema_name}.${tabela.tabela} possui ${tabela.dead_tuples} dead tuples.`,
        });
      }
    });

    banco.queries_lentas.forEach((query, index) => {
      if (query.mean_exec_time >= 1000) {
        alerts.push({
          id: `${banco.banco}-query-critical-${index}`,
          banco: banco.banco,
          nivel: 'critical',
          titulo: 'Consulta lenta critica',
          descricao: `Media de ${formatNumber(query.mean_exec_time)} ms em ${query.calls} chamadas.`,
        });
      } else if (query.mean_exec_time >= 300) {
        alerts.push({
          id: `${banco.banco}-query-warning-${index}`,
          banco: banco.banco,
          nivel: 'warning',
          titulo: 'Consulta lenta em atencao',
          descricao: `Media de ${formatNumber(query.mean_exec_time)} ms em ${query.calls} chamadas.`,
        });
      }
    });
  });

  return alerts;
}

function getResumoCount(resumo: AdminResumoAuditoria[], operacao: string): number {
  return resumo
    .filter((item) => item.operacao === operacao)
    .reduce((total, item) => total + item.total, 0);
}

export function AdminMonitoringScreen() {
  const [bancos, setBancos] = useState<AdminMonitoramentoBanco[]>([]);
  const [logs, setLogs] = useState<AdminLogAuditoria[]>([]);
  const [resumo, setResumo] = useState<AdminResumoAuditoria[]>([]);
  const [bancoFiltro, setBancoFiltro] = useState(ALL_FILTER);
  const [operacaoFiltro, setOperacaoFiltro] = useState(ALL_FILTER);
  const [tabelaFiltro, setTabelaFiltro] = useState(ALL_FILTER);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextBancos, nextLogs, nextResumo] = await Promise.all([
        obterMonitoramentoAdmin(10),
        listarAuditoriaAdmin(50),
        obterResumoAuditoriaAdmin(),
      ]);
      setBancos(nextBancos);
      setLogs(nextLogs);
      setResumo(nextResumo);
    } catch {
      setError('Nao foi possivel carregar a observabilidade do sistema.');
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

  const alerts = useMemo(() => buildAlerts(bancos), [bancos]);

  const resumoTotal = useMemo(
    () => resumo.reduce((total, item) => total + item.total, 0),
    [resumo],
  );

  const activeConnections = useMemo(
    () => bancos.reduce((total, banco) => total + banco.conexoes_ativas.length, 0),
    [bancos],
  );

  const expensiveQueries = useMemo<QueryComBanco[]>(
    () =>
      bancos
        .flatMap((banco) =>
          banco.queries_lentas.map((query) => ({
            ...query,
            banco: banco.banco,
          })),
        )
        .sort((left, right) => right.mean_exec_time - left.mean_exec_time)
        .slice(0, 5),
    [bancos],
  );

  const bancosFiltro = useMemo(
    () => [ALL_FILTER, ...Array.from(new Set(logs.map((log) => log.banco))).sort()],
    [logs],
  );

  const operacoesFiltro = useMemo(
    () => [ALL_FILTER, ...Array.from(new Set(logs.map((log) => log.operacao))).sort()],
    [logs],
  );

  const tabelasFiltro = useMemo(
    () => [ALL_FILTER, ...Array.from(new Set(logs.map((log) => log.tabela_afetada))).sort()],
    [logs],
  );

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesBanco = bancoFiltro === ALL_FILTER || log.banco === bancoFiltro;
        const matchesOperacao = operacaoFiltro === ALL_FILTER || log.operacao === operacaoFiltro;
        const matchesTabela = tabelaFiltro === ALL_FILTER || log.tabela_afetada === tabelaFiltro;
        return matchesBanco && matchesOperacao && matchesTabela;
      }),
    [bancoFiltro, logs, operacaoFiltro, tabelaFiltro],
  );

  if (loading) {
    return <LoadingIndicator text="Carregando observabilidade..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Observabilidade do Sistema</Text>
          <Text style={styles.subtitle}>
            Consolida auditoria, monitoramento dos bancos e alertas reais para apoiar a
            administracao do Wonder.
          </Text>
        </View>
        <Button title="Atualizar" size="sm" variant="secondary" onPress={handleRefresh} />
      </View>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.summaryGrid}>
        <SummaryCard label="Eventos de auditoria" value={resumoTotal} />
        <SummaryCard label="INSERTs" value={getResumoCount(resumo, 'INSERT')} color={theme.colors.success} />
        <SummaryCard label="UPDATEs" value={getResumoCount(resumo, 'UPDATE')} color={theme.colors.warning} />
        <SummaryCard label="DELETEs" value={getResumoCount(resumo, 'DELETE')} color={theme.colors.error} />
        <SummaryCard label="SELECTs" value={getResumoCount(resumo, 'SELECT')} color={theme.colors.primary} />
        <SummaryCard label="Conexoes ativas" value={activeConnections} />
        <SummaryCard label="Bancos monitorados" value={bancos.length} />
        <SummaryCard label="Alertas ativos" value={alerts.length} color={alerts.length ? theme.colors.error : theme.colors.success} />
      </View>

      <Card style={styles.sectionCard}>
        <SectionHeader
          title="Auditoria recente"
          description="Mostra quem executou cada operacao registrada nos bancos."
        />
        <FilterRow label="Banco" options={bancosFiltro} value={bancoFiltro} onChange={setBancoFiltro} />
        <FilterRow
          label="Operacao"
          options={operacoesFiltro}
          value={operacaoFiltro}
          onChange={setOperacaoFiltro}
        />
        <FilterRow label="Tabela" options={tabelasFiltro} value={tabelaFiltro} onChange={setTabelaFiltro} />

        {filteredLogs.length ? (
          filteredLogs.slice(0, 12).map((log) => {
            const meta = OPERATION_META[log.operacao] ?? {
              label: log.operacao,
              action: `realizou ${log.operacao}`,
              color: theme.colors.textMuted,
            };

            return (
              <View key={`${log.banco}-${log.id}`} style={styles.auditItem}>
                <View style={styles.auditHeader}>
                  <Text style={styles.auditMessage}>
                    Usuario {log.usuario_id ?? 'sistema'} {meta.action} em {log.tabela_afetada}
                  </Text>
                  <Text style={[styles.operationChip, { backgroundColor: meta.color }]}>
                    {log.operacao}
                  </Text>
                </View>
                <View style={styles.detailGrid}>
                  <Detail label="Banco" value={log.banco} />
                  <Detail label="Tabela" value={log.tabela_afetada} />
                  <Detail label="Tipo" value={meta.label} />
                  <Detail label="Quando" value={formatBackendDateTime(log.data_hora)} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>Nenhum evento encontrado para os filtros selecionados.</Text>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <SectionHeader
          title="Saude dos bancos"
          description="Resume o estado atual das bases PostgreSQL consultadas pelo Admin."
        />
        {bancos.length ? (
          bancos.map((banco) => {
            const status = getBankStatus(banco);
            const statusColor = getStatusColor(status);

            return (
              <View key={banco.banco} style={styles.bankStatusCard}>
                <View style={styles.bankHeader}>
                  <Text style={styles.bankTitle}>{banco.banco}</Text>
                  <Text style={[styles.statusPill, { backgroundColor: statusColor }]}>
                    {getStatusLabel(status)}
                  </Text>
                </View>
                {banco.erro ? <Text style={styles.error}>Falha ao consultar: {banco.erro}</Text> : null}
                <View style={styles.metricRow}>
                  <Metric label="Conexoes ativas" value={banco.conexoes_ativas.length} />
                  <Metric label="Consultas analisadas" value={banco.queries_lentas.length} />
                  <Metric label="Dead tuples" value={sumDeadTuples(banco)} />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>Nenhum banco retornado pelo monitoramento.</Text>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <SectionHeader
          title="Consultas mais custosas"
          description="Exibe as consultas retornadas pelo pg_stat_statements com maior tempo medio."
        />
        {expensiveQueries.length ? (
          expensiveQueries.map((query, index) => (
            <View key={`${query.banco}-query-${index}`} style={styles.queryItem}>
              <View style={styles.queryHeader}>
                <Text style={styles.itemTitle}>{query.banco}</Text>
                <Text style={styles.queryTime}>{formatNumber(query.mean_exec_time)} ms media</Text>
              </View>
              <Text style={styles.itemText}>Chamadas: {query.calls} | Linhas: {query.rows}</Text>
              <Text style={styles.queryText}>{normalizeQuery(query.query)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Nenhuma consulta custosa retornada.</Text>
        )}
      </Card>

      <Card style={styles.sectionCard}>
        <SectionHeader
          title="Alertas"
          description="Sinaliza situacoes de atencao calculadas a partir dos dados reais de monitoramento."
        />
        {alerts.length ? (
          alerts.slice(0, 8).map((alert) => (
            <View key={alert.id} style={styles.alertItem}>
              <View style={[styles.alertMarker, { backgroundColor: getStatusColor(alert.nivel) }]} />
              <View style={styles.alertContent}>
                <Text style={styles.itemTitle}>{alert.titulo}</Text>
                <Text style={styles.itemText}>Banco: {alert.banco}</Text>
                <Text style={styles.itemText}>{alert.descricao}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noAlertBox}>
            <Text style={styles.noAlertTitle}>Nenhum alerta critico no momento.</Text>
            <Text style={styles.itemText}>
              Os bancos consultados nao retornaram sinais de conexoes excessivas, locks longos,
              dead tuples elevados ou consultas muito lentas.
            </Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function SummaryCard({ label, value, color = theme.colors.primary }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>{description}</Text>
    </View>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={`${label}-${option}`}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerText: {
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  summaryCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    flexBasis: '48%',
    flexGrow: 1,
    gap: theme.spacing.xs,
    minWidth: 136,
    minHeight: 78,
    padding: theme.spacing.md,
  },
  summaryValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 16,
  },
  sectionCard: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  sectionDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  filterBlock: {
    gap: theme.spacing.xs,
  },
  filterLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  filterRow: {
    gap: theme.spacing.sm,
  },
  filterChip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  filterChipTextActive: {
    color: theme.colors.white,
  },
  auditItem: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  auditHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  auditMessage: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 20,
  },
  operationChip: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  detailItem: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 128,
    gap: 2,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  bankStatusCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  bankHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'capitalize',
  },
  statusPill: {
    borderRadius: theme.borderRadius.pill,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  metricBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flex: 1,
    gap: theme.spacing.xs,
    minWidth: 104,
    padding: theme.spacing.sm,
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    lineHeight: 14,
  },
  queryItem: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  queryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  queryTime: {
    flexShrink: 0,
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  itemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  queryText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    lineHeight: 16,
  },
  alertItem: {
    alignItems: 'stretch',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  alertMarker: {
    width: 6,
  },
  alertContent: {
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  noAlertBox: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  noAlertTitle: {
    color: theme.colors.success,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
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
