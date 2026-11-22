import { useNavigation, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { ServiceCard } from '../components/catalog/ServiceCard';
import { CustomerFeedbackCard } from '../components/customer/CustomerFeedbackCard';
import { HeroGlows } from '../components/customer/HeroGlows';
import { LoadingIndicator } from '../components/LoadingIndicator';
import {
  getCurrentMonthKey,
  MonthlyAvailabilityCalendar,
} from '../components/MonthlyAvailabilityCalendar';
import { SearchStackParamList } from '../navigation/SearchStack';
import type { MainTabsParamList } from '../navigation/MainTabs';
import {
  criarAgendamento,
  extrairMensagemErro,
  listarDiasDisponiveis,
  listarDisponibilidade,
} from '../services/agendamentos';
import { listarServicosPrestador, obterPrestador } from '../services/catalogo';
import { customerTheme } from '../styles/customerTheme';
import { HorarioDisponivel } from '../types/agendamento';
import { Prestador, Servico } from '../types/catalogo';

type AgendamentoRouteProp = {
  key: string;
  name: 'Agendamento';
  params: SearchStackParamList['Agendamento'];
};

type AgendamentoNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SearchStackParamList, 'Agendamento'>,
  BottomTabNavigationProp<MainTabsParamList>
>;
type Etapa = 'servico' | 'data' | 'horario';

function formatDateLabel(data: string) {
  const [year, month, day] = data.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatWeekDay(data: string) {
  const [year, month, day] = data.split('-').map(Number);
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(new Date(year, month - 1, day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTimeLabel(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
    .format(new Date(isoDate));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function isConflictError(error: unknown) {
  return (error as { response?: { status?: number } })?.response?.status === 409;
}

export function AgendamentoScreen() {
  const navigation = useNavigation<AgendamentoNavigationProp>();
  const route = useRoute<AgendamentoRouteProp>();
  const { prestadorId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const [etapa, setEtapa] = useState<Etapa>('servico');
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
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroConfirmacao, setErroConfirmacao] = useState<string | null>(null);
  const consultaDias = useRef<AbortController | null>(null);
  const consultaHorarios = useRef<AbortController | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregandoInicial(true);
      setErro(null);
      try {
        const [prestadorData, servicosData] = await Promise.all([
          obterPrestador(prestadorId), listarServicosPrestador(prestadorId),
        ]);
        if (!ativo) return;
        setPrestador(prestadorData);
        setServicos(servicosData);
      } catch {
        if (ativo) setErro('Não foi possível carregar os dados para agendamento.');
      } finally {
        if (ativo) setCarregandoInicial(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
      consultaDias.current?.abort();
      consultaHorarios.current?.abort();
    };
  }, [prestadorId]);

  useEffect(() => {
    const controle = new AbortController();
    consultaDias.current = controle;
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
        }, controle.signal);
        if (!controle.signal.aborted) {
          setDiasDisponiveis(response.dias.filter((dia) => dia.disponivel).map((dia) => dia.data));
        }
      } catch {
        if (!controle.signal.aborted) {
          setDiasDisponiveis([]);
          setErroConfirmacao('Não foi possível carregar os dias disponíveis.');
        }
      } finally {
        if (!controle.signal.aborted) setCarregandoDias(false);
      }
    }
    carregarDias();
    return () => controle.abort();
  }, [mesSelecionado, prestadorId, servicoSelecionado]);

  const carregarHorarios = useCallback(async (data: string, manterMensagem = false) => {
    if (!servicoSelecionado) return;
    consultaHorarios.current?.abort();
    const controle = new AbortController();
    consultaHorarios.current = controle;
    setCarregandoHorarios(true);
    setHorarios([]);
    setHorarioSelecionado(null);
    if (!manterMensagem) setErroConfirmacao(null);
    try {
      const response = await listarDisponibilidade({
        prestador_id: prestadorId,
        servico_id: servicoSelecionado.id,
        data,
      }, controle.signal);
      if (!controle.signal.aborted) setHorarios(response.horarios);
    } catch {
      if (!controle.signal.aborted) {
        setHorarios([]);
        setErroConfirmacao('Não foi possível carregar os horários disponíveis.');
      }
    } finally {
      if (!controle.signal.aborted) setCarregandoHorarios(false);
    }
  }, [prestadorId, servicoSelecionado]);

  function limparHorarios() {
    consultaHorarios.current?.abort();
    consultaHorarios.current = null;
    setCarregandoHorarios(false);
    setHorarios([]);
    setHorarioSelecionado(null);
  }

  function selecionarServico(servico: Servico) {
    if (servicoSelecionado?.id === servico.id) return;
    consultaDias.current?.abort();
    limparHorarios();
    setServicoSelecionado(servico);
    setMesSelecionado(getCurrentMonthKey());
    setDataSelecionada(null);
    setDiasDisponiveis([]);
    setErroConfirmacao(null);
  }

  function trocarMes(mes: string) {
    consultaDias.current?.abort();
    limparHorarios();
    setMesSelecionado(mes);
    setDiasDisponiveis([]);
    setDataSelecionada(null);
    setErroConfirmacao(null);
  }

  function selecionarData(data: string) {
    limparHorarios();
    setDataSelecionada(data);
    void carregarHorarios(data);
  }

  function voltar() {
    setErroConfirmacao(null);
    if (etapa === 'horario') {
      setEtapa('data');
      return;
    }
    if (etapa === 'data') {
      setEtapa('servico');
      return;
    }
    navigation.goBack();
  }

  async function confirmarAgendamento() {
    if (agendamentoConfirmado || enviando) return;
    if (!servicoSelecionado || !dataSelecionada || !horarioSelecionado
        || carregandoDias || carregandoHorarios
        || !horarios.some((horario) => horario.inicio === horarioSelecionado.inicio)) {
      setErroConfirmacao('Selecione serviço, data e horário para confirmar.');
      return;
    }
    setEnviando(true);
    setErroConfirmacao(null);
    const consultaNoEnvio = consultaHorarios.current;
    try {
      await criarAgendamento({
        prestador_id: prestadorId,
        servico_id: servicoSelecionado.id,
        inicio: horarioSelecionado.inicio,
      });
      setAgendamentoConfirmado(true);
    } catch (error) {
      if (isConflictError(error)) {
        if (consultaNoEnvio?.signal.aborted || consultaHorarios.current !== consultaNoEnvio) return;
        setErroConfirmacao('Este horário foi ocupado. Escolha outro horário disponível.');
        setHorarioSelecionado(null);
        await carregarHorarios(dataSelecionada, true);
        return;
      }
      setErroConfirmacao(extrairMensagemErro(
        error, 'Não foi possível confirmar o agendamento. Tente novamente.'
      ));
    } finally {
      setEnviando(false);
    }
  }

  const podeConfirmar = Boolean(servicoSelecionado && dataSelecionada && horarioSelecionado
    && !agendamentoConfirmado
    && !carregandoDias && !carregandoHorarios
    && horarios.some((horario) => horario.inicio === horarioSelecionado.inicio));
  const titulo = etapa === 'servico' ? 'Serviços oferecidos'
    : etapa === 'data' ? 'Escolha uma data' : 'Escolha um horário';
  const resumo = useMemo(() => {
    if (!prestador || !servicoSelecionado || !dataSelecionada || !horarioSelecionado) return null;
    return {
      prestador: prestador.nome_estab,
      servico: servicoSelecionado.nome,
      data: formatDateLabel(dataSelecionada),
      horario: formatTimeLabel(horarioSelecionado.inicio),
      preco: formatPrice(servicoSelecionado.preco),
      duracao: servicoSelecionado.duracao_min,
    };
  }, [dataSelecionada, horarioSelecionado, prestador, servicoSelecionado]);

  if (carregandoInicial) {
    return <View style={styles.loading}><LoadingIndicator text="Carregando agendamento..." /></View>;
  }

  if (erro || !prestador) {
    return (
      <View style={styles.loading}>
        <Card><Text style={styles.message}>{erro || 'Prestador não encontrado.'}</Text></Card>
      </View>
    );
  }

  function fecharConfirmacao() {
    setAgendamentoConfirmado(false);
    navigation.navigate('Home');
  }

  function abrirAgendamentos() {
    setAgendamentoConfirmado(false);
    navigation.navigate('Appointments');
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.hero, { paddingTop: desktop ? 44 : Math.max(insets.top, 56), paddingHorizontal: desktop ? 76 : 20 }]}>
      <HeroGlows desktop={desktop} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={voltar} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={26} color="#FFF" />
        </Pressable>
        <Text style={styles.title}>{titulo}</Text>
      </View>
      {etapa === 'servico' ? <Text style={styles.description}>Escolha um serviço</Text> : null}
      </View>
      <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
      <View style={[styles.container, desktop && styles.containerDesktop]}>

      {etapa === 'servico' ? (
        <>
          <View style={styles.list}>
            {servicos.length === 0 ? (
              <View style={styles.infoCard}><Text style={styles.message}>Nenhum serviço disponível.</Text></View>
            ) : servicos.map((servico) => (
              <ServiceCard
                key={servico.id}
                servico={servico}
                selected={servicoSelecionado?.id === servico.id}
                onPress={() => selecionarServico(servico)}
                variant="booking"
              />
            ))}
          </View>
        </>
      ) : null}

      {etapa === 'data' ? (
        <>
          {carregandoDias ? <LoadingIndicator text="Carregando dias disponíveis..." /> : null}
          <MonthlyAvailabilityCalendar
            mes={mesSelecionado}
            diasDisponiveis={diasDisponiveis}
            dataSelecionada={dataSelecionada}
            onChangeMes={trocarMes}
            onSelectDate={selecionarData}
            variant="customer"
          />
          {erroConfirmacao ? <View style={styles.errorCard}><Text style={styles.errorText}>{erroConfirmacao}</Text></View> : null}
        </>
      ) : null}

      {etapa === 'horario' && servicoSelecionado && dataSelecionada ? (
        <>
          <View style={styles.selectedService}>
            <CatalogImage fotoUrl={servicoSelecionado.foto_url} kind="service" style={styles.selectedServiceImage} />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{servicoSelecionado.nome}</Text>
              <Text style={styles.serviceMeta}>{servicoSelecionado.duracao_min} min · {formatPrice(servicoSelecionado.preco)}</Text>
            </View>
          </View>
          <Pressable onPress={() => setEtapa('data')} style={styles.dateCard}>
            <View style={styles.calendarBadge}>
              <Image source={require('../assets/icons/calendar-v4.png')} style={styles.calendarImage} />
            </View>
            <View style={styles.dateContent}>
              <Text style={styles.dateTitle}>{formatWeekDay(dataSelecionada)}</Text>
              <Text style={styles.dateText}>{formatDateLabel(dataSelecionada)}</Text>
            </View>
          </Pressable>
          <Text style={styles.sectionTitle}>Horários disponíveis</Text>
          {carregandoHorarios ? <LoadingIndicator text="Carregando horarios..." />
            : horarios.length === 0 ? (
              <View style={styles.infoCard}><Text style={styles.message}>Nenhum horário disponível para esta data.</Text></View>
            ) : (
              <View style={styles.timeGrid}>
                {horarios.map((horario) => {
                  const selected = horarioSelecionado?.inicio === horario.inicio;
                  return (
                    <Card key={horario.inicio} onPress={() => setHorarioSelecionado(horario)}
                      style={[styles.timeChip, width < 375 && styles.timeChipNarrow, selected && styles.timeChipSelected]}>
                      <Text style={[styles.timeText, selected && styles.timeTextSelected]}>{formatTimeLabel(horario.inicio)}</Text>
                    </Card>
                  );
                })}
              </View>
            )}
          {resumo ? (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Confirme antes de continuar</Text>
              <Text style={styles.reviewText}>{resumo.servico} em {resumo.prestador}</Text>
              <Text style={styles.reviewText}>{resumo.data}, às {resumo.horario}</Text>
              <Text style={styles.reviewValue}>{resumo.preco} · {resumo.duracao} min</Text>
            </View>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.reviewTitle}>Escolha o melhor horário</Text>
              <Text style={styles.reviewText}>O horário ficará reservado após a confirmação.</Text>
            </View>
          )}
          {erroConfirmacao ? <View style={styles.errorCard}><Text style={styles.errorText}>{erroConfirmacao}</Text></View> : null}
        </>
      ) : null}
      </View>
      </View>
      </ScrollView>

      <View style={[styles.footer, { marginBottom: desktop ? 0 : 86 + insets.bottom }]}>
        <View style={[styles.footerInner, desktop && styles.footerInnerDesktop]}>
          {etapa === 'servico' && servicoSelecionado ? <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>1 serviço selecionado</Text>
            <Text style={styles.summaryValue}>{formatPrice(servicoSelecionado.preco)}</Text>
          </View> : null}
          {etapa === 'servico' ? <Button title="Continuar" disabled={!servicoSelecionado} onPress={() => setEtapa('data')} style={styles.primaryButton} /> : null}
          {etapa === 'data' ? <Button title="Ver horários" disabled={!dataSelecionada || carregandoDias || carregandoHorarios}
            loading={carregandoHorarios} onPress={() => setEtapa('horario')} style={styles.primaryButton} /> : null}
          {etapa === 'horario' ? <Button title="Confirmar agendamento" onPress={confirmarAgendamento} loading={enviando}
            disabled={!podeConfirmar || enviando} style={styles.primaryButton} /> : null}
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={agendamentoConfirmado}
        onRequestClose={fecharConfirmacao}
      >
        <View style={styles.modalOverlay}>
          <CustomerFeedbackCard kind="success" title="Agendamento confirmado!"
            description="Você pode acompanhá-lo na aba Agenda.">
            <Pressable accessibilityRole="button" accessibilityLabel="Ver agendamentos"
              onPress={abrirAgendamentos} style={styles.successPrimaryButton}>
              <Text style={styles.successPrimaryText}>Ver agendamentos</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={fecharConfirmacao}
              style={styles.successSecondaryButton}
            >
              <Text style={styles.successSecondaryText}>OK</Text>
            </Pressable>
          </CustomerFeedbackCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.v4.bg, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { backgroundColor: customerTheme.v4.primary, height: 179, overflow: 'hidden' },
  sheet: { backgroundColor: customerTheme.v4.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, marginTop: -28, paddingTop: 28 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingTop: 40 },
  loading: { backgroundColor: customerTheme.v4.bg, flex: 1, justifyContent: 'center', padding: 20 },
  container: {
    alignSelf: 'center', flexGrow: 1, gap: 12, maxWidth: 560, paddingBottom: 160,
    paddingHorizontal: 20, width: '100%',
  },
  containerDesktop: { maxWidth: 1100, paddingHorizontal: 76 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, height: 44 },
  backButton: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 22,
    height: 44, justifyContent: 'center', width: 44,
  },
  backIcon: { color: '#FFF', fontSize: 28, fontWeight: '600', lineHeight: 30 },
  title: { color: '#FFF', flex: 1, fontFamily: customerTheme.v4.fontDisplay, fontSize: 24 },
  description: { color: '#FFF', fontFamily: customerTheme.v4.fontBody, fontSize: 16, marginLeft: 56, marginTop: 8 },
  list: { gap: 12 },
  serviceInfo: { flex: 1, gap: 3 },
  serviceName: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 18 },
  serviceMeta: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  summaryRow: {
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 40,
  },
  summaryLabel: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  summaryValue: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 23 },
  footer: { backgroundColor: '#FFF', paddingBottom: 18, paddingHorizontal: 20, paddingTop: 10, ...customerTheme.shadow },
  footerInner: { alignSelf: 'center', gap: 8, maxWidth: 560, width: '100%' },
  footerInnerDesktop: { maxWidth: 950 },
  primaryButton: { backgroundColor: customerTheme.v4.primary, borderRadius: 28, height: 56, marginTop: 2, ...customerTheme.shadow },
  modalOverlay: {
    alignItems: 'center', backgroundColor: 'rgba(46, 10, 87, 0.62)', flex: 1,
    justifyContent: 'center', paddingHorizontal: 30,
  },
  successPrimaryButton: {
    alignItems: 'center', backgroundColor: customerTheme.v4.primary, borderRadius: 28,
    height: 56, justifyContent: 'center', width: '100%',
    shadowColor: customerTheme.v4.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 8,
  },
  successPrimaryText: { color: '#FFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
  successSecondaryButton: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 28,
    height: 48, justifyContent: 'center', width: '100%',
  },
  successSecondaryText: {
    color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16,
  },
  selectedService: {
    alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24,
    flexDirection: 'row', gap: 14, minHeight: 80, padding: 12, ...customerTheme.shadow,
  },
  selectedServiceImage: { borderRadius: 16, height: 56, width: 56 },
  dateCard: {
    alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24,
    flexDirection: 'row', gap: 14, minHeight: 80, padding: 16, ...customerTheme.shadow,
  },
  calendarBadge: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  calendarImage: { height: 24, width: 24 },
  dateContent: { flex: 1 },
  dateTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 19 },
  dateText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15, marginTop: 2 },
  sectionTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 22, marginTop: 8 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  timeChip: {
    alignItems: 'center', backgroundColor: '#FFF', borderColor: customerTheme.v4.border, borderRadius: 16,
    borderWidth: 1, height: 54, justifyContent: 'center', padding: 0, width: '30.9%',
  },
  timeChipNarrow: { width: '45%' },
  timeChipSelected: { backgroundColor: customerTheme.v4.primary, borderColor: customerTheme.v4.primary },
  timeText: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
  timeTextSelected: { color: '#FFF' },
  infoCard: {
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    gap: 3, padding: 14, ...customerTheme.shadow,
  },
  reviewCard: {
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    gap: 3, padding: 14, ...customerTheme.shadow,
  },
  reviewTitle: { color: customerTheme.colors.text, fontSize: 13, fontWeight: '600' },
  reviewText: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  reviewValue: { color: customerTheme.colors.brandDark, fontSize: 13, fontWeight: '700', marginTop: 4 },
  message: { color: customerTheme.colors.textSecondary, fontSize: 13 },
  errorCard: { backgroundColor: customerTheme.colors.dangerSurface, borderRadius: customerTheme.radius.card, padding: 14 },
  errorText: { color: customerTheme.colors.danger, fontSize: 13 },
});
