import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getCurrentMonthKey,
  MonthlyAvailabilityCalendar,
} from '../components/MonthlyAvailabilityCalendar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import {
  criarAgendamento,
  extrairMensagemErro,
  listarDiasDisponiveis,
  listarDisponibilidade,
} from '../services/agendamentos';
import { listarServicosPrestador, obterPrestador } from '../services/catalogo';
import { theme } from '../styles/theme';
import { HorarioDisponivel } from '../types/agendamento';
import { Prestador, Servico } from '../types/catalogo';

type AgendamentoRouteProp = {
  key: string;
  name: 'Agendamento';
  params: SearchStackParamList['Agendamento'];
};

type AgendamentoNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'Agendamento'>;

function formatDateLabel(data: string) {
  const [year, month, day] = data.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatTimeLabel(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function isConflictError(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status === 409;
}

export function AgendamentoScreen() {
  const navigation = useNavigation<AgendamentoNavigationProp>();
  const route = useRoute<AgendamentoRouteProp>();
  const { prestadorId } = route.params;

  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(getCurrentMonthKey());
  const [diasDisponiveis, setDiasDisponiveis] = useState<string[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<HorarioDisponivel[]>([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState<HorarioDisponivel | null>(null);

  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [carregandoDias, setCarregandoDias] = useState(false);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregandoInicial(true);
      setErro(null);

      try {
        const [prestadorData, servicosData] = await Promise.all([
          obterPrestador(prestadorId),
          listarServicosPrestador(prestadorId),
        ]);

        if (!ativo) return;

        setPrestador(prestadorData);
        setServicos(servicosData);
      } catch {
        if (ativo) setErro('Nao foi possivel carregar os dados para agendamento.');
      } finally {
        if (ativo) setCarregandoInicial(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [prestadorId]);

  useEffect(() => {
    let ativo = true;

    async function carregarDias() {
      if (!servicoSelecionado) {
        setDiasDisponiveis([]);
        return;
      }

      setCarregandoDias(true);
      setErroConfirmacao(null);

      try {
        const response = await listarDiasDisponiveis({
          prestador_id: prestadorId,
          servico_id: servicoSelecionado.id,
          mes: mesSelecionado,
        });

        if (!ativo) return;

        setDiasDisponiveis(
          response.dias.filter((dia) => dia.disponivel).map((dia) => dia.data)
        );
      } catch {
        if (ativo) {
          setDiasDisponiveis([]);
          setErroConfirmacao('Nao foi possivel carregar os dias disponiveis.');
        }
      } finally {
        if (ativo) setCarregandoDias(false);
      }
    }

    carregarDias();
    return () => {
      ativo = false;
    };
  }, [mesSelecionado, prestadorId, servicoSelecionado]);

  const carregarHorarios = useCallback(
    async (data: string) => {
      if (!servicoSelecionado) return;

      setCarregandoHorarios(true);
      setErroConfirmacao(null);

      try {
        const response = await listarDisponibilidade({
          prestador_id: prestadorId,
          servico_id: servicoSelecionado.id,
          data,
        });

        setHorarios(response.horarios);
      } catch {
        setHorarios([]);
        setErroConfirmacao('Nao foi possivel carregar os horarios disponiveis.');
      } finally {
        setCarregandoHorarios(false);
      }
    },
    [prestadorId, servicoSelecionado]
  );

  function selecionarServico(servico: Servico) {
    setServicoSelecionado(servico);
    setMesSelecionado(getCurrentMonthKey());
    setDataSelecionada(null);
    setDiasDisponiveis([]);
    setHorarios([]);
    setHorarioSelecionado(null);
    setErroConfirmacao(null);
  }

  function trocarMes(mes: string) {
    setMesSelecionado(mes);
    setDataSelecionada(null);
    setHorarios([]);
    setHorarioSelecionado(null);
    setErroConfirmacao(null);
  }

  function selecionarData(data: string) {
    setDataSelecionada(data);
    setHorarioSelecionado(null);
    setHorarios([]);
    carregarHorarios(data);
  }

  async function confirmarAgendamento() {
    if (!servicoSelecionado || !dataSelecionada || !horarioSelecionado) {
      setErroConfirmacao('Selecione servico, data e horario para confirmar.');
      return;
    }

    setEnviando(true);
    setErroConfirmacao(null);

    try {
      await criarAgendamento({
        prestador_id: prestadorId,
        servico_id: servicoSelecionado.id,
        inicio: horarioSelecionado.inicio,
      });

      Alert.alert('Agendamento confirmado!', 'Voce pode acompanha-lo na aba Agenda.', [
        { text: 'OK', onPress: () => navigation.navigate('SearchHome') },
      ]);
    } catch (error) {
      if (isConflictError(error)) {
        setErroConfirmacao('Este horario foi ocupado. Escolha outro horario disponivel.');
        setHorarioSelecionado(null);
        await carregarHorarios(dataSelecionada);
        return;
      }

      setErroConfirmacao(
        extrairMensagemErro(error, 'Nao foi possivel confirmar o agendamento. Tente novamente.')
      );
    } finally {
      setEnviando(false);
    }
  }

  const podeConfirmar = Boolean(servicoSelecionado && dataSelecionada && horarioSelecionado);
  const resumo = useMemo(() => {
    if (!prestador || !servicoSelecionado || !dataSelecionada || !horarioSelecionado) {
      return null;
    }

    return {
      prestador: prestador.nome_estab,
      servico: servicoSelecionado.nome,
      data: formatDateLabel(dataSelecionada),
      horario: formatTimeLabel(horarioSelecionado.inicio),
      preco: servicoSelecionado.preco,
      duracao: servicoSelecionado.duracao_min,
    };
  }, [dataSelecionada, horarioSelecionado, prestador, servicoSelecionado]);

  if (carregandoInicial) {
    return <LoadingIndicator text="Carregando agendamento..." />;
  }

  if (erro || !prestador) {
    return (
      <View style={styles.container}>
        <Card>
          <Text style={styles.cardText}>{erro || 'Prestador nao encontrado.'}</Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agendar servico</Text>
        <Text style={styles.subtitle}>{prestador.nome_estab}</Text>
      </View>

      <Text style={styles.sectionTitle}>1. Servico</Text>
      {servicos.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhum servico disponivel para este prestador.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {servicos.map((servico) => {
            const selected = servicoSelecionado?.id === servico.id;

            return (
              <Card
                key={servico.id}
                onPress={() => selecionarServico(servico)}
                style={[styles.selectableCard, selected && styles.selectedCard]}
              >
                <Text style={[styles.cardTitle, selected && styles.selectedText]}>
                  {servico.nome}
                </Text>
                <Text style={[styles.cardText, selected && styles.selectedMutedText]}>
                  R$ {servico.preco.toFixed(2)} - {servico.duracao_min} min
                </Text>
              </Card>
            );
          })}
        </View>
      )}

      {servicoSelecionado ? (
        <>
          <Text style={styles.sectionTitle}>2. Data</Text>
          <Card style={styles.calendarCard}>
            {carregandoDias ? (
              <LoadingIndicator text="Carregando dias disponiveis..." />
            ) : null}
            <MonthlyAvailabilityCalendar
              mes={mesSelecionado}
              diasDisponiveis={diasDisponiveis}
              dataSelecionada={dataSelecionada}
              onChangeMes={trocarMes}
              onSelectDate={selecionarData}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendAvailable]} />
                <Text style={styles.legendText}>Disponivel</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.legendUnavailable]} />
                <Text style={styles.legendText}>Indisponivel</Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {dataSelecionada ? (
        <>
          <Text style={styles.sectionTitle}>3. Horario disponivel</Text>
          {carregandoHorarios ? (
            <LoadingIndicator text="Carregando horarios..." />
          ) : horarios.length === 0 ? (
            <Card>
              <Text style={styles.cardText}>Nenhum horario disponivel para esta data.</Text>
            </Card>
          ) : (
            <View style={styles.timeGrid}>
              {horarios.map((horario) => {
                const selected = horarioSelecionado?.inicio === horario.inicio;

                return (
                  <Card
                    key={horario.inicio}
                    onPress={() => setHorarioSelecionado(horario)}
                    style={[styles.timeChip, selected && styles.selectedCard]}
                  >
                    <Text style={[styles.timeText, selected && styles.selectedText]}>
                      {formatTimeLabel(horario.inicio)}
                    </Text>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      ) : null}

      {resumo ? (
        <>
          <Text style={styles.sectionTitle}>4. Revisao</Text>
          <Card style={styles.reviewCard}>
            <Text style={styles.cardTitle}>{resumo.servico}</Text>
            <Text style={styles.cardText}>{resumo.prestador}</Text>
            <Text style={styles.cardText}>
              {resumo.data} as {resumo.horario}
            </Text>
            <Text style={styles.cardText}>
              R$ {resumo.preco.toFixed(2)} - {resumo.duracao} min
            </Text>
          </Card>
        </>
      ) : null}

      {erroConfirmacao ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{erroConfirmacao}</Text>
        </Card>
      ) : null}

      <Button
        title="Confirmar agendamento"
        onPress={confirmarAgendamento}
        loading={enviando}
        disabled={!podeConfirmar || enviando}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.xs,
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.sm,
  },
  selectableCard: {
    gap: theme.spacing.xs,
  },
  selectedCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  selectedText: {
    color: theme.colors.white,
  },
  selectedMutedText: {
    color: theme.colors.white,
  },
  calendarCard: {
    gap: theme.spacing.md,
  },
  legend: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  legendDot: {
    borderRadius: theme.borderRadius.pill,
    height: 10,
    width: 10,
  },
  legendAvailable: {
    backgroundColor: theme.colors.primary,
  },
  legendUnavailable: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  legendText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  timeChip: {
    minWidth: 92,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  timeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  reviewCard: {
    gap: theme.spacing.xs,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
  },
});
