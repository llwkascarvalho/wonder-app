import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { LoadingIndicator } from '../components/LoadingIndicator';
import {
  atualizarStatusAgendamento,
  extrairMensagemErro,
  listarAgendamentos,
} from '../services/agendamentos';
import { listarServicosPrestador, obterPrestador } from '../services/catalogo';
import { theme } from '../styles/theme';
import { Agendamento } from '../types/agendamento';
import { Prestador, Servico } from '../types/catalogo';

type AgendaTab = 'agendados' | 'finalizados' | 'cancelados';

type AgendamentoEnriquecido = {
  agendamento: Agendamento;
  prestador?: Prestador;
  servico?: Servico;
};

const tabs: Array<{ key: AgendaTab; label: string }> = [
  { key: 'agendados', label: 'Agendados' },
  { key: 'finalizados', label: 'Finalizados' },
  { key: 'cancelados', label: 'Cancelados' },
];

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluido',
  finalizado: 'Finalizado',
};

const agendadosStatuses = new Set(['pendente', 'confirmado']);
const finalizadosStatuses = new Set(['concluido', 'finalizado']);
const canceladosStatuses = new Set(['cancelado']);
const cancelaveisStatuses = new Set(['pendente', 'confirmado']);

function ordenarAgendamentos(a: Agendamento, b: Agendamento) {
  return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
}

function formatarData(inicio: string) {
  const data = new Date(inicio);

  if (Number.isNaN(data.getTime())) {
    return {
      data: inicio,
      horario: '-',
    };
  }

  return {
    data: data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    horario: data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

async function enriquecerAgendamentos(agendamentos: Agendamento[]) {
  const prestadorIds = Array.from(new Set(agendamentos.map((item) => item.prestador_id)));
  const prestadores = new Map<number, Prestador>();
  const servicos = new Map<number, Servico>();

  const prestadoresResults = await Promise.allSettled(
    prestadorIds.map(async (prestadorId) => {
      const prestador = await obterPrestador(prestadorId);
      return { prestadorId, prestador };
    })
  );

  prestadoresResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      prestadores.set(result.value.prestadorId, result.value.prestador);
    }
  });

  const servicosResults = await Promise.allSettled(
    prestadorIds.map(async (prestadorId) => {
      const lista = await listarServicosPrestador(prestadorId);
      return { prestadorId, lista };
    })
  );

  servicosResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      result.value.lista.forEach((servico) => {
        servicos.set(servico.id, servico);
      });
    }
  });

  return agendamentos.map<AgendamentoEnriquecido>((agendamento) => ({
    agendamento,
    prestador: prestadores.get(agendamento.prestador_id),
    servico: servicos.get(agendamento.servico_id),
  }));
}

function filtrarPorAba(item: AgendamentoEnriquecido, activeTab: AgendaTab) {
  const status = item.agendamento.status;

  if (activeTab === 'agendados') {
    return agendadosStatuses.has(status);
  }

  if (activeTab === 'finalizados') {
    return finalizadosStatuses.has(status);
  }

  return canceladosStatuses.has(status);
}

export function AppointmentsScreen() {
  const [activeTab, setActiveTab] = useState<AgendaTab>('agendados');
  const [agendamentos, setAgendamentos] = useState<AgendamentoEnriquecido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);

  const carregarAgendamentos = useCallback(async () => {
    setErro(null);

    try {
      const resultado = await listarAgendamentos();
      const ordenados = [...resultado].sort(ordenarAgendamentos);
      setAgendamentos(await enriquecerAgendamentos(ordenados));
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Nao foi possivel carregar seus agendamentos.'));
    }
  }, []);

  useEffect(() => {
    setCarregando(true);
    carregarAgendamentos().finally(() => setCarregando(false));
  }, [carregarAgendamentos]);

  const agendamentosVisiveis = useMemo(
    () => agendamentos.filter((item) => filtrarPorAba(item, activeTab)),
    [activeTab, agendamentos]
  );

  async function handleRefresh() {
    setAtualizando(true);
    await carregarAgendamentos();
    setAtualizando(false);
  }

  function confirmarCancelamento(agendamento: Agendamento) {
    Alert.alert('Cancelar agendamento', 'Deseja cancelar este agendamento?', [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar agendamento',
        style: 'destructive',
        onPress: () => cancelarAgendamento(agendamento.id),
      },
    ]);
  }

  async function cancelarAgendamento(agendamentoId: number) {
    setCancelandoId(agendamentoId);

    try {
      await atualizarStatusAgendamento(agendamentoId, {
        status: 'cancelado',
        motivo: 'Cancelado pelo cliente via app.',
      });
      await carregarAgendamentos();
      setActiveTab('cancelados');
      Alert.alert('Agendamento cancelado', 'O agendamento foi movido para Cancelados.');
    } catch (error) {
      Alert.alert(
        'Nao foi possivel cancelar',
        extrairMensagemErro(error, 'Tente novamente em instantes.')
      );
    } finally {
      setCancelandoId(null);
    }
  }

  if (carregando) {
    return <LoadingIndicator text="Carregando agendamentos..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agendamentos</Text>

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
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {erro ? (
        <Card>
          <Text style={styles.cardText}>{erro}</Text>
        </Card>
      ) : (
        <FlatList
          data={agendamentosVisiveis}
          keyExtractor={(item) => String(item.agendamento.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Card>
              <Text style={styles.emptyTitle}>Lista vazia...</Text>
              <Text style={styles.emptyText}>Seus agendamentos aparecerao aqui.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <AppointmentCard
              item={item}
              cancelando={cancelandoId === item.agendamento.id}
              disabled={cancelandoId !== null}
              onCancel={() => confirmarCancelamento(item.agendamento)}
            />
          )}
        />
      )}
    </View>
  );
}

function AppointmentCard({
  item,
  cancelando,
  disabled,
  onCancel,
}: {
  item: AgendamentoEnriquecido;
  cancelando: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  const { agendamento, prestador, servico } = item;
  const { data, horario } = formatarData(agendamento.inicio);
  const cancelavel = cancelaveisStatuses.has(agendamento.status);
  const statusLabel = STATUS_LABEL[agendamento.status] ?? agendamento.status;
  const providerName = prestador?.nome_estab ?? `Prestador ${agendamento.prestador_id}`;
  const serviceName = servico?.nome ?? `Servico ${agendamento.servico_id}`;

  return (
    <Card style={styles.agendamentoCard}>
      <CatalogImage fotoUrl={prestador?.foto_url} kind="provider" style={styles.providerPhoto} />

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {providerName}
        </Text>
        <Text style={styles.serviceText} numberOfLines={1}>
          {serviceName}
        </Text>
        <Text style={styles.cardText}>{data}</Text>
        <Text style={styles.cardText}>Horario: {horario}</Text>
      </View>

      <View style={styles.sideContent}>
        <Text style={[styles.statusBadge, statusStyle(agendamento.status)]} numberOfLines={1}>
          {statusLabel}
        </Text>
        {cancelavel ? (
          <Pressable
            accessibilityRole="button"
            disabled={disabled || cancelando}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
              (disabled || cancelando) && styles.cancelButtonDisabled,
            ]}
          >
            <Text style={styles.cancelButtonText}>{cancelando ? 'Cancelando...' : 'Cancelar'}</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

function statusStyle(status: string) {
  if (canceladosStatuses.has(status)) {
    return styles.statusCanceled;
  }

  if (finalizadosStatuses.has(status)) {
    return styles.statusDone;
  }

  return styles.statusOpen;
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
  list: {
    flexGrow: 1,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
  },
  agendamentoCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  providerPhoto: {
    borderRadius: theme.borderRadius.md,
    height: 64,
    width: 64,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  sideContent: {
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    width: 104,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  serviceText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  statusBadge: {
    borderRadius: theme.borderRadius.pill,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    lineHeight: 14,
    minWidth: 84,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 84,
    paddingHorizontal: theme.spacing.sm,
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  cancelButtonDisabled: {
    opacity: 0.56,
  },
  statusOpen: {
    backgroundColor: theme.colors.primary,
  },
  statusDone: {
    backgroundColor: theme.colors.success,
  },
  statusCanceled: {
    backgroundColor: theme.colors.error,
  },
  emptyTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
});
