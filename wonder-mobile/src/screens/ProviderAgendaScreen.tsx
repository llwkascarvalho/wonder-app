import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ProviderIcon } from '../components/provider/ProviderIcon';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarStatusAgendamento,
  listarAgendamentos,
  listarServicos,
  obterPrestadorLogado,
} from '../services/provider';
import { theme } from '../styles/theme';
import { Agendamento, Prestador, Servico } from '../types/provider';

type AgendaTab = 'abertos' | 'finalizados';

const openStatuses = ['pendente', 'confirmado'];
const doneStatuses = ['concluido', 'finalizado'];

export function ProviderAgendaScreen() {
  const { usuario, signOut } = useAuth();
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [activeTab, setActiveTab] = useState<AgendaTab>('abertos');
  const [showCanceled, setShowCanceled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const servicosById = useMemo(() => {
    return servicos.reduce<Record<number, Servico>>((acc, servico) => {
      acc[servico.id] = servico;
      return acc;
    }, {});
  }, [servicos]);

  const visibleAppointments = useMemo(() => {
    if (activeTab === 'abertos') {
      return agendamentos.filter((agendamento) => openStatuses.includes(agendamento.status));
    }

    if (showCanceled) {
      return agendamentos.filter((agendamento) => agendamento.status === 'cancelado');
    }

    return agendamentos.filter((agendamento) => doneStatuses.includes(agendamento.status));
  }, [activeTab, agendamentos, showCanceled]);

  const loadAgenda = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const nextAgendamentos = await listarAgendamentos();
      setAgendamentos(nextAgendamentos);

      if (usuario?.id) {
        const foundPrestador = await obterPrestadorLogado(usuario.id);
        setPrestador(foundPrestador);
        if (foundPrestador) {
          setServicos(await listarServicos(foundPrestador.id));
        }
      }
    } catch {
      setError('Nao foi possivel carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  async function handleStatus(agendamentoId: number, status: string) {
    setSavingId(agendamentoId);
    setError('');
    try {
      await atualizarStatusAgendamento(agendamentoId, status);
      setAgendamentos(await listarAgendamentos());
    } catch {
      setError('Nao foi possivel atualizar o agendamento.');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <LoadingIndicator text="Carregando agendamentos..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAgenda} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Ola, {prestador?.nome_estab || usuario?.email || 'prestador'}</Text>
        <Button title="Sair" size="sm" variant="secondary" onPress={signOut} />
      </View>

      <View style={styles.segment}>
        <Button
          title="Em aberto"
          variant={activeTab === 'abertos' ? 'primary' : 'outline'}
          onPress={() => setActiveTab('abertos')}
          style={styles.segmentButton}
        />
        <Button
          title="Finalizados"
          variant={activeTab === 'finalizados' ? 'primary' : 'outline'}
          onPress={() => setActiveTab('finalizados')}
          style={styles.segmentButton}
        />
      </View>

      {activeTab === 'finalizados' ? (
        <View style={styles.filterRow}>
          <View style={styles.dateBadge}>
            <ProviderIcon name="calendar-today" color={theme.colors.white} size={18} />
            <Text style={styles.dateBadgeText}>{new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
          <Button
            title={showCanceled ? 'Ver concluidos' : 'Ver cancelados'}
            size="sm"
            variant={showCanceled ? 'primary' : 'outline'}
            onPress={() => setShowCanceled((current) => !current)}
          />
        </View>
      ) : (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Agendado hoje</Text>
          <View style={styles.calendarButton}>
            <ProviderIcon name="calendar-today" color={theme.colors.white} size={22} />
          </View>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {visibleAppointments.length ? (
        visibleAppointments.map((agendamento) => (
          <AppointmentCard
            key={agendamento.id}
            agendamento={agendamento}
            servico={servicosById[agendamento.servico_id]}
            saving={savingId === agendamento.id}
            showActions={activeTab === 'abertos'}
            onFinish={() => handleStatus(agendamento.id, 'concluido')}
            onCancel={() => handleStatus(agendamento.id, 'cancelado')}
          />
        ))
      ) : (
        <Card>
          <Text style={styles.emptyText}>Nenhum agendamento para este filtro.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function AppointmentCard({
  agendamento,
  servico,
  saving,
  showActions,
  onFinish,
  onCancel,
}: {
  agendamento: Agendamento;
  servico?: Servico;
  saving: boolean;
  showActions: boolean;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const start = new Date(agendamento.inicio);
  const dateLabel = Number.isNaN(start.getTime())
    ? agendamento.inicio
    : `${start.toLocaleDateString('pt-BR')} ${start.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

  return (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentAvatar}>
        <Text style={styles.appointmentAvatarText}>#{agendamento.cliente_id}</Text>
      </View>
      <View style={styles.appointmentInfo}>
        <Text style={styles.cardTitle}>{servico?.nome || `Servico ${agendamento.servico_id}`}</Text>
        <Text style={styles.cardText}>Cliente {agendamento.cliente_id}</Text>
        <Text style={styles.cardText}>{dateLabel}</Text>
      </View>
      {showActions ? (
        <View style={styles.actions}>
          <Button title="Finalizar" size="sm" variant="outline" loading={saving} onPress={onFinish} />
          <Button title="Cancelar" size="sm" variant="danger" disabled={saving} onPress={onCancel} />
        </View>
      ) : (
        <Text style={[styles.statusBadge, agendamento.status === 'cancelado' && styles.statusCanceled]}>
          {agendamento.status}
        </Text>
      )}
    </Card>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greeting: {
    color: theme.colors.primary,
    flex: 1,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  segment: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  segmentButton: {
    flex: 1,
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  dateBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    height: 40,
    justifyContent: 'center',
    width: 48,
  },
  appointmentCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  appointmentAvatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  appointmentAvatarText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  appointmentInfo: {
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
  actions: {
    gap: theme.spacing.xs,
    width: 96,
  },
  statusBadge: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  statusCanceled: {
    backgroundColor: theme.colors.error,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
