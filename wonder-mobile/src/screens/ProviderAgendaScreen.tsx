import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import {
  getCurrentMonthKey,
  MonthlyAvailabilityCalendar,
} from '../components/MonthlyAvailabilityCalendar';
import { ProviderIcon } from '../components/provider/ProviderIcon';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarStatusAgendamento,
  listarAgendamentos,
  listarServicos,
  obterPrestadorLogado,
} from '../services/provider';
import { resolveProfilePhotoUrl } from '../services/profileService';
import { theme } from '../styles/theme';
import { Agendamento, Prestador, Servico } from '../types/provider';

type AgendaTab = 'abertos' | 'finalizados' | 'cancelados';

const tabs: Array<{ key: AgendaTab; label: string }> = [
  { key: 'abertos', label: 'Em aberto' },
  { key: 'finalizados', label: 'Finalizados' },
  { key: 'cancelados', label: 'Cancelados' },
];

const openStatuses = ['pendente', 'confirmado'];
const doneStatuses = ['concluido', 'finalizado'];
const statusLabels: Record<string, string> = {
  pendente: 'Agendado',
  confirmado: 'Agendado',
  cancelado: 'Cancelado',
  concluido: 'Concluido',
  finalizado: 'Finalizado',
};

function extractBackendMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

export function ProviderAgendaScreen() {
  const { usuario, signOut } = useAuth();
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [activeTab, setActiveTab] = useState<AgendaTab>('abertos');
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(getCurrentMonthKey());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Agendamento | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');

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

    if (activeTab === 'cancelados') {
      return agendamentos.filter((agendamento) => agendamento.status === 'cancelado');
    }

    return agendamentos.filter((agendamento) => doneStatuses.includes(agendamento.status));
  }, [activeTab, agendamentos]);

  const sectionTitle = selectedDate === formatDateKey(new Date())
    ? 'Agendados hoje'
    : `Agendados em ${formatDateLabel(selectedDate)}`;

  const loadAgenda = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const nextAgendamentos = await listarAgendamentos(selectedDate);
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
  }, [selectedDate, usuario?.id]);

  useEffect(() => {
    loadAgenda();
  }, [loadAgenda]);

  async function handleStatus(agendamentoId: number, status: string, motivo?: string) {
    setSavingId(agendamentoId);
    setError('');
    try {
      await atualizarStatusAgendamento(agendamentoId, status, motivo);
      setAgendamentos(await listarAgendamentos(selectedDate));
      return true;
    } catch (statusError) {
      const message = extractBackendMessage(statusError, 'Nao foi possivel atualizar o agendamento.');
      setError(message);
      Alert.alert('Nao foi possivel atualizar', message);
      return false;
    } finally {
      setSavingId(null);
    }
  }

  function openCancelModal(agendamento: Agendamento) {
    setCancelTarget(agendamento);
    setCancelMotivo('');
  }

  function closeCancelModal() {
    if (savingId !== null) {
      return;
    }
    setCancelTarget(null);
    setCancelMotivo('');
  }

  async function confirmCancel() {
    const motivo = cancelMotivo.trim();
    if (!cancelTarget) {
      return;
    }

    if (!motivo) {
      Alert.alert('Motivo obrigatorio', 'Informe o motivo do cancelamento.');
      return;
    }

    const cancelled = await handleStatus(cancelTarget.id, 'cancelado', motivo);
    if (cancelled) {
      setCancelTarget(null);
      setCancelMotivo('');
    }
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    setCalendarVisible(false);
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
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.segmentButton,
                selected && styles.segmentButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <Text style={styles.selectedDateText}>{formatDateLabel(selectedDate)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCalendarVisible((current) => !current)}
          style={styles.calendarButton}
        >
          <ProviderIcon name="calendar-today" color={theme.colors.white} size={22} />
        </Pressable>
      </View>

      {calendarVisible ? (
        <Card>
          <MonthlyAvailabilityCalendar
            mes={calendarMonth}
            diasDisponiveis={[]}
            dataSelecionada={selectedDate}
            allowUnavailableSelection
            onChangeMes={setCalendarMonth}
            onSelectDate={handleSelectDate}
          />
        </Card>
      ) : null}

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
            onCancel={() => openCancelModal(agendamento)}
          />
        ))
      ) : (
        <Card>
          <Text style={styles.emptyText}>Nenhum agendamento para este filtro.</Text>
        </Card>
      )}

      <Modal transparent visible={cancelTarget !== null} animationType="fade" onRequestClose={closeCancelModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancelar atendimento</Text>
            <Text style={styles.modalText}>
              Informe o motivo. O cancelamento nao sera permitido proximo do atendimento.
            </Text>
            <TextInput
              multiline
              maxLength={100}
              editable={savingId === null}
              placeholder="Ex.: Prestador indisponivel no horario."
              placeholderTextColor={theme.colors.textMuted}
              value={cancelMotivo}
              onChangeText={setCancelMotivo}
              style={styles.reasonInput}
            />
            <View style={styles.modalActions}>
              <Button
                title="Voltar"
                size="sm"
                variant="secondary"
                disabled={savingId !== null}
                onPress={closeCancelModal}
              />
              <Button
                title={savingId !== null ? 'Cancelando...' : 'Confirmar'}
                size="sm"
                variant="danger"
                disabled={savingId !== null}
                onPress={confirmCancel}
              />
            </View>
          </View>
        </View>
      </Modal>
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
        <ClientAvatar nome={agendamento.cliente_nome} fotoUrl={agendamento.cliente_foto_url} />
      </View>
      <View style={styles.appointmentInfo}>
        <Text style={styles.cardTitle}>{servico?.nome || `Servico ${agendamento.servico_id}`}</Text>
        <Text style={styles.cardText}>{agendamento.cliente_nome || `Cliente ${agendamento.cliente_id}`}</Text>
        <Text style={styles.cardText}>{dateLabel}</Text>
      </View>
      {showActions ? (
        <View style={styles.actions}>
          <Button title="Finalizar" size="sm" variant="outline" loading={saving} onPress={onFinish} />
          <Button title="Cancelar" size="sm" variant="danger" disabled={saving} onPress={onCancel} />
        </View>
      ) : (
        <Text style={[styles.statusBadge, agendamento.status === 'cancelado' && styles.statusCanceled]}>
          {statusLabels[agendamento.status] ?? agendamento.status}
        </Text>
      )}
    </Card>
  );
}

function ClientAvatar({ nome, fotoUrl }: { nome?: string | null; fotoUrl?: string | null }) {
  const source = resolveProfilePhotoUrl(fotoUrl);
  const initial = nome?.trim().slice(0, 1).toUpperCase();

  if (source) {
    return <Image source={{ uri: source }} style={styles.clientImage} />;
  }

  return <Text style={styles.appointmentAvatarText}>{initial || 'Cliente'}</Text>;
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
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentButton: {
    alignItems: 'center',
    flex: 1,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  segmentTextActive: {
    color: theme.colors.white,
  },
  pressed: {
    opacity: 0.86,
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
  selectedDateText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
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
  clientImage: {
    borderRadius: theme.borderRadius.md,
    height: 56,
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
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  modalText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
  },
  reasonInput: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 88,
    padding: theme.spacing.md,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
});
