import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatalogImage } from '../components/catalog/CatalogImage';
import { RatingStars } from '../components/catalog/RatingStars';
import { CustomerFeedbackCard } from '../components/customer/CustomerFeedbackCard';
import { CustomerFormSheet } from '../components/customer/CustomerFormSheet';
import { HeroGlows } from '../components/customer/HeroGlows';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { useResetScrollOnFocus } from '../navigation/useResetScrollOnFocus';
import { atualizarStatusAgendamento, extrairMensagemErro, listarAgendamentos } from '../services/agendamentos';
import { criarAvaliacaoPrestador, listarAvaliacoesPrestador } from '../services/avaliacoes';
import { listarServicosPrestador, obterPrestador } from '../services/catalogo';
import { customerTheme } from '../styles/customerTheme';
import { Agendamento } from '../types/agendamento';
import { Avaliacao } from '../types/avaliacao';
import { Prestador, Servico } from '../types/catalogo';
import { podeAvaliarAgendamento } from '../utils/avaliacoes';

type AgendaTab = 'proximos' | 'historico' | 'cancelados';
type FeedbackModal = 'cancelado' | 'avaliado' | null;
type AgendamentoEnriquecido = {
  agendamento: Agendamento;
  prestador?: Prestador;
  servico?: Servico;
  avaliacao?: Avaliacao;
  avaliacoesCarregadas: boolean;
};

const tabs: Array<{ key: AgendaTab; label: string }> = [
  { key: 'proximos', label: 'Agendados' },
  { key: 'historico', label: 'Finalizados' },
  { key: 'cancelados', label: 'Cancelados' },
];
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Agendado', confirmado: 'Agendado', cancelado: 'Cancelado',
  concluido: 'Finalizado', finalizado: 'Finalizado',
};
const agendadosStatuses = new Set(['pendente', 'confirmado']);
const finalizadosStatuses = new Set(['concluido', 'finalizado']);
const canceladosStatuses = new Set(['cancelado']);
const cancelaveisStatuses = new Set(['pendente', 'confirmado']);

function ordenarAgendamentos(a: Agendamento, b: Agendamento) {
  return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
}

function formatarData(inicio: string) {
  const date = new Date(inicio);
  if (Number.isNaN(date.getTime())) return { data: inicio, horario: '-' };
  return {
    data: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
    horario: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function formatarPreco(preco?: number) {
  return preco === undefined ? 'Não informado'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco);
}

function formatarEndereco(prestador?: Prestador) {
  if (!prestador) return 'Não informado';
  return [prestador.endereco, prestador.numero].filter(Boolean).join(', ')
    || prestador.cidade || 'Não informado';
}

async function enriquecerAgendamentos(agendamentos: Agendamento[]) {
  const ids = Array.from(new Set(agendamentos.map((item) => item.prestador_id)));
  const prestadores = new Map<number, Prestador>();
  const servicos = new Map<number, Servico>();
  const avaliacoes = new Map<number, Avaliacao>();
  const avaliacoesCarregadas = new Set<number>();
  const prestadoresResults = await Promise.allSettled(ids.map(async (id) => ({ id, valor: await obterPrestador(id) })));
  prestadoresResults.forEach((result) => {
    if (result.status === 'fulfilled') prestadores.set(result.value.id, result.value.valor);
  });
  const servicosResults = await Promise.allSettled(ids.map(async (id) => ({ id, valor: await listarServicosPrestador(id) })));
  servicosResults.forEach((result) => {
    if (result.status === 'fulfilled') result.value.valor.forEach((servico) => servicos.set(servico.id, servico));
  });
  const avaliacoesResults = await Promise.allSettled(ids.map(async (id) => ({ id, valor: await listarAvaliacoesPrestador(id) })));
  avaliacoesResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      avaliacoesCarregadas.add(result.value.id);
      result.value.valor.forEach((avaliacao) => avaliacoes.set(avaliacao.agendamento_id, avaliacao));
    }
  });
  return agendamentos.map<AgendamentoEnriquecido>((agendamento) => ({
    agendamento,
    prestador: prestadores.get(agendamento.prestador_id),
    servico: servicos.get(agendamento.servico_id),
    avaliacao: avaliacoes.get(agendamento.id),
    avaliacoesCarregadas: avaliacoesCarregadas.has(agendamento.prestador_id),
  }));
}

function filtrarPorAba(item: AgendamentoEnriquecido, aba: AgendaTab, agora: number) {
  const status = item.agendamento.status;
  const passado = new Date(item.agendamento.inicio).getTime() < agora;
  if (aba === 'proximos') return !passado && agendadosStatuses.has(status);
  if (aba === 'historico') return !canceladosStatuses.has(status) && (passado || finalizadosStatuses.has(status));
  return canceladosStatuses.has(status);
}

export function AppointmentsScreen() {
  const listRef = useRef<FlatList<AgendamentoEnriquecido>>(null);
  useResetScrollOnFocus(listRef);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [activeTab, setActiveTab] = useState<AgendaTab>('proximos');
  const [agendamentos, setAgendamentos] = useState<AgendamentoEnriquecido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Agendamento | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelErro, setCancelErro] = useState<string | null>(null);
  const [avaliacaoTarget, setAvaliacaoTarget] = useState<AgendamentoEnriquecido | null>(null);
  const [notaAvaliacao, setNotaAvaliacao] = useState(0);
  const [avaliacaoErro, setAvaliacaoErro] = useState<string | null>(null);
  const [avaliandoId, setAvaliandoId] = useState<number | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>(null);

  const carregarAgendamentos = useCallback(async () => {
    setErro(null);
    try {
      const resultado = await listarAgendamentos();
      setAgendamentos(await enriquecerAgendamentos([...resultado].sort(ordenarAgendamentos)));
    } catch (error) {
      setErro(extrairMensagemErro(error, 'Não foi possível carregar seus agendamentos.'));
    }
  }, []);

  useEffect(() => {
    setCarregando(true);
    carregarAgendamentos().finally(() => setCarregando(false));
  }, [carregarAgendamentos]);

  const visiveis = useMemo(
    () => agendamentos.filter((item) => filtrarPorAba(item, activeTab, Date.now())),
    [activeTab, agendamentos]
  );

  async function handleRefresh() {
    setAtualizando(true);
    await carregarAgendamentos();
    setAtualizando(false);
  }

  function abrirCancelamento(agendamento: Agendamento) {
    setCancelTarget(agendamento);
    setCancelMotivo('');
    setCancelErro(null);
  }

  function fecharCancelamento() {
    if (cancelandoId !== null) return;
    setCancelTarget(null);
    setCancelMotivo('');
    setCancelErro(null);
  }

  async function cancelarAgendamento() {
    const motivo = cancelMotivo.trim();
    if (!cancelTarget) return;
    if (!motivo) return setCancelErro('Informe o motivo do cancelamento.');
    setCancelandoId(cancelTarget.id);
    setCancelErro(null);
    try {
      await atualizarStatusAgendamento(cancelTarget.id, { status: 'cancelado', motivo });
      setCancelTarget(null);
      setCancelMotivo('');
      await carregarAgendamentos();
      setActiveTab('cancelados');
      setFeedbackModal('cancelado');
    } catch (error) {
      setCancelErro(extrairMensagemErro(error, 'Não foi possível cancelar. Tente novamente.'));
    } finally {
      setCancelandoId(null);
    }
  }

  function abrirAvaliacao(item: AgendamentoEnriquecido) {
    setAvaliacaoTarget(item);
    setNotaAvaliacao(0);
    setAvaliacaoErro(null);
  }

  function fecharAvaliacao() {
    if (avaliandoId !== null) return;
    setAvaliacaoTarget(null);
    setNotaAvaliacao(0);
    setAvaliacaoErro(null);
  }

  async function enviarAvaliacao() {
    if (!avaliacaoTarget) return;
    if (notaAvaliacao < 1 || notaAvaliacao > 5) {
      setAvaliacaoErro('Selecione de 1 a 5 estrelas para continuar.');
      return;
    }
    const { agendamento } = avaliacaoTarget;
    setAvaliandoId(agendamento.id);
    setAvaliacaoErro(null);
    try {
      await criarAvaliacaoPrestador(agendamento.prestador_id, {
        agendamento_id: agendamento.id, nota: notaAvaliacao,
      });
      setAvaliacaoTarget(null);
      setNotaAvaliacao(0);
      await carregarAgendamentos();
      setActiveTab('historico');
      setFeedbackModal('avaliado');
    } catch (error) {
      setAvaliacaoErro(extrairMensagemErro(error, 'Não foi possível avaliar. Tente novamente.'));
    } finally {
      setAvaliandoId(null);
    }
  }

  if (carregando) {
    return <View style={styles.loading}><LoadingIndicator text="Carregando agendamentos..." /></View>;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.hero, { paddingTop: desktop ? 44 : Math.max(insets.top, 56), paddingHorizontal: desktop ? 76 : 20 }]}>
        <HeroGlows desktop={desktop} />
        <View style={styles.intro}>
          <Text style={styles.title}>Agendamentos</Text>
          <Text style={styles.subtitle}>Acompanhe seus horários.</Text>
        </View>
      </View>
      <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
      <View style={[styles.container, desktop && styles.containerDesktop]}>
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable key={tab.key} accessibilityRole="button" onPress={() => {
                setActiveTab(tab.key);
                setDetalheId(null);
                listRef.current?.scrollToOffset({ offset: 0, animated: false });
              }} style={[styles.tab, selected && styles.tabActive]}>
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {erro ? <View style={styles.errorCard}><Text style={styles.errorText}>{erro}</Text></View> : (
          <FlatList
            ref={listRef}
            data={visiveis}
            keyExtractor={(item) => String(item.agendamento.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={atualizando} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}><MaterialIcons name="event-busy" size={26} color={customerTheme.colors.brand} /></View>
                <Text style={styles.emptyTitle}>Nenhum agendamento por aqui</Text>
                <Text style={styles.emptyText}>Quando você agendar um serviço, ele aparecerá nesta lista.</Text>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Search')} style={styles.primaryAction}>
                  <Text style={styles.primaryActionText}>Buscar serviços</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <AppointmentCard
                item={item}
                expanded={detalheId === item.agendamento.id}
                cancelando={cancelandoId === item.agendamento.id}
                disabled={cancelandoId !== null || avaliandoId !== null}
                onDetails={() => setDetalheId(detalheId === item.agendamento.id ? null : item.agendamento.id)}
                onCancel={() => abrirCancelamento(item.agendamento)}
                onEvaluate={() => abrirAvaliacao(item)}
              />
            )}
          />
        )}
      </View>
      </View>

      <CustomerFormSheet visible={cancelTarget !== null} title="Cancelar agendamento"
        onClose={fecharCancelamento} disabled={cancelandoId !== null}>
            <Text style={styles.modalText}>Informe o motivo. O cancelamento não será permitido próximo do horário do atendimento.</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Motivo do cancelamento</Text>
              <TextInput
                multiline maxLength={100} editable={cancelandoId === null}
                placeholder="Ex.: Não poderei comparecer no horário."
                placeholderTextColor={customerTheme.colors.textSecondary}
                value={cancelMotivo}
                onChangeText={(value) => { setCancelMotivo(value); setCancelErro(null); }}
                style={styles.reasonInput}
              />
            </View>
            {cancelErro ? <Text style={styles.formError}>{cancelErro}</Text> : null}
            <View style={styles.modalActions}>
              <ModalButton label="Voltar" onPress={fecharCancelamento} disabled={cancelandoId !== null} variant="secondary" />
              <ModalButton label={cancelandoId !== null ? 'Cancelando...' : 'Confirmar'} onPress={cancelarAgendamento} disabled={cancelandoId !== null} variant="danger" />
            </View>
      </CustomerFormSheet>

      <CustomerFormSheet visible={avaliacaoTarget !== null} title="Avaliar atendimento"
        onClose={fecharAvaliacao} disabled={avaliandoId !== null}>
            <Text style={styles.modalText}>Como foi seu atendimento com {avaliacaoTarget?.prestador?.nome_estab ?? 'este prestador'}?</Text>
            <View style={styles.ratingSelector}>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((nota) => <Pressable key={nota} accessibilityRole="button"
                  accessibilityLabel={`${nota} ${nota === 1 ? 'estrela' : 'estrelas'}`}
                  accessibilityState={{ selected: notaAvaliacao === nota }} disabled={avaliandoId !== null}
                  onPress={() => { setNotaAvaliacao(nota); setAvaliacaoErro(null); }}>
                  <Image source={nota <= notaAvaliacao
                    ? require('../assets/icons/modal-star-filled-v4.png')
                    : require('../assets/icons/modal-star-empty-v4.png')} style={styles.ratingStar} />
                </Pressable>)}
              </View>
              <Text style={[styles.ratingHint, notaAvaliacao > 0 && styles.ratingHintSelected]}>
                {notaAvaliacao > 0 ? `${notaAvaliacao} de 5 estrelas` : 'Selecione uma nota'}
              </Text>
            </View>
            <View style={styles.ratingScale}><Text style={styles.scaleText}>1 = Péssimo</Text><Text style={styles.scaleText}>5 = Ótimo</Text></View>
            {avaliacaoErro ? <Text style={styles.formError}>{avaliacaoErro}</Text> : null}
            <View style={styles.modalActions}>
              <ModalButton label="Voltar" onPress={fecharAvaliacao} disabled={avaliandoId !== null} variant="secondary" />
              <ModalButton label={avaliandoId !== null ? 'Enviando...' : 'Enviar avaliação'} onPress={enviarAvaliacao} disabled={avaliandoId !== null || notaAvaliacao === 0} variant="primary" />
            </View>
      </CustomerFormSheet>
      <FeedbackModalView type={feedbackModal} onClose={() => setFeedbackModal(null)} />
    </View>
  );
}

function AppointmentCard({ item, expanded, cancelando, disabled, onDetails, onCancel, onEvaluate }: {
  item: AgendamentoEnriquecido; expanded: boolean; cancelando: boolean; disabled: boolean;
  onDetails: () => void; onCancel: () => void; onEvaluate: () => void;
}) {
  const { agendamento, prestador, servico, avaliacao, avaliacoesCarregadas } = item;
  const { data, horario } = formatarData(agendamento.inicio);
  const passado = new Date(agendamento.inicio).getTime() < Date.now();
  const cancelavel = !passado && cancelaveisStatuses.has(agendamento.status);
  const avaliavel = podeAvaliarAgendamento(agendamento.status, avaliacoesCarregadas, avaliacao);
  const statusPassado = passado && agendadosStatuses.has(agendamento.status);
  const statusLabel = statusPassado ? 'Passado' : STATUS_LABEL[agendamento.status] ?? agendamento.status;
  return (
    <View style={styles.appointmentCard}>
      <View style={styles.summary}>
        <CatalogImage fotoUrl={prestador?.foto_url} kind="provider" style={styles.servicePhoto} />
        <View style={styles.summaryText}>
          <Text style={styles.serviceName} numberOfLines={1}>{servico?.nome ?? `Serviço ${agendamento.servico_id}`}</Text>
          <Text style={styles.providerName} numberOfLines={1}>{prestador?.nome_estab ?? `Prestador ${agendamento.prestador_id}`}</Text>
        </View>
        <View style={[styles.statusBadge, statusStyle(agendamento.status, statusPassado)]}>
          <View style={[styles.statusDotHalo, statusDotHaloStyle(agendamento.status, statusPassado)]}>
            <View style={[styles.statusDot, statusDotStyle(agendamento.status, statusPassado)]} />
          </View>
          <Text style={[styles.statusText, statusTextStyle(agendamento.status, statusPassado)]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.dateBar}><MaterialIcons name="event" size={20} color={customerTheme.v4.primary} /><Text style={styles.dateText}>{data} · {horario}</Text></View>
      {expanded ? (
        <View style={styles.details}>
          <View style={styles.divider} />
          <DetailRow label="Serviço" value={servico?.nome ?? 'Não informado'} />
          <DetailRow label="Duração" value={servico ? `${servico.duracao_min} min` : 'Não informada'} />
          <DetailRow label="Valor" value={formatarPreco(servico?.preco)} />
          <DetailRow label="Endereço" value={formatarEndereco(prestador)} />
        </View>
      ) : null}
      {avaliacao ? <View style={styles.completedRating}><RatingStars value={avaliacao.nota} size={17} /><Text style={styles.completedRatingText}>Avaliado</Text></View> : null}
      {avaliavel ? (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onEvaluate} style={[styles.fullPrimaryButton, disabled && styles.disabled]}>
          <Text style={styles.fullPrimaryText}>Avaliar atendimento</Text>
        </Pressable>
      ) : (
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" onPress={onDetails} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>{expanded ? 'Ocultar' : 'Detalhes'}</Text>
            <MaterialIcons name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={customerTheme.colors.brand} />
          </Pressable>
          {cancelavel ? <Pressable accessibilityRole="button" disabled={disabled || cancelando} onPress={onCancel} style={[styles.cancelButton, (disabled || cancelando) && styles.disabled]}><Text style={styles.cancelButtonText}>{cancelando ? 'Cancelando...' : 'Cancelar'}</Text></Pressable> : null}
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue} numberOfLines={2}>{value}</Text></View>;
}

function ModalButton({ label, onPress, disabled, variant }: { label: string; onPress: () => void; disabled: boolean; variant: 'secondary' | 'danger' | 'primary' }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.modalButton, variant === 'secondary' ? styles.modalButtonSecondary : variant === 'danger' ? styles.modalButtonDanger : styles.modalButtonPrimary, disabled && styles.disabled]}><Text style={[styles.modalButtonText, variant === 'secondary' ? styles.modalButtonTextSecondary : variant === 'danger' ? styles.modalButtonTextDanger : styles.modalButtonTextPrimary]}>{label}</Text></Pressable>;
}

function FeedbackModalView({ type, onClose }: { type: FeedbackModal; onClose: () => void }) {
  const canceled = type === 'cancelado';
  return (
    <Modal transparent visible={type !== null} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}><CustomerFeedbackCard kind={canceled ? 'danger' : 'success'}
        title={canceled ? 'Agendamento cancelado' : 'Avaliação enviada!'}
        description={canceled ? 'O agendamento foi movido para Cancelados.' : 'Obrigado por avaliar este atendimento.'}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.feedbackButton}><Text style={styles.feedbackButtonText}>OK</Text></Pressable>
      </CustomerFeedbackCard></View>
    </Modal>
  );
}

function statusStyle(status: string, passado = false) {
  if (passado && agendadosStatuses.has(status)) return styles.statusPast;
  if (canceladosStatuses.has(status)) return styles.statusCanceled;
  if (finalizadosStatuses.has(status)) return styles.statusDone;
  return styles.statusOpen;
}
function statusTextStyle(status: string, passado = false) {
  if (passado && agendadosStatuses.has(status)) return styles.statusPastText;
  if (canceladosStatuses.has(status)) return styles.statusCanceledText;
  if (finalizadosStatuses.has(status)) return styles.statusDoneText;
  return styles.statusOpenText;
}
function statusDotStyle(status: string, passado = false) {
  if (passado && agendadosStatuses.has(status)) return styles.statusDotPast;
  if (canceladosStatuses.has(status)) return styles.statusDotCanceled;
  if (finalizadosStatuses.has(status)) return styles.statusDotDone;
  return styles.statusDotOpen;
}
function statusDotHaloStyle(status: string, passado = false) {
  if (passado && agendadosStatuses.has(status)) return styles.statusDotHaloPast;
  if (canceladosStatuses.has(status)) return styles.statusDotHaloCanceled;
  if (finalizadosStatuses.has(status)) return styles.statusDotHaloDone;
  return styles.statusDotHaloOpen;
}

const appointmentShadow = {
  boxShadow: '0 2px 4px rgba(36,16,46,0.05), 0 8px 18px rgba(36,16,46,0.08)',
  elevation: 2,
  shadowColor: '#24102E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
} as const;

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.v4.bg, flex: 1 },
  loading: { alignItems: 'center', backgroundColor: customerTheme.v4.bg, flex: 1, justifyContent: 'center' },
  hero: { backgroundColor: customerTheme.v4.primary, height: 176, overflow: 'hidden' },
  sheet: { backgroundColor: customerTheme.v4.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, marginTop: -28, paddingTop: 20 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingTop: 40 },
  container: { alignSelf: 'center', flex: 1, gap: 14, maxWidth: 560, paddingHorizontal: 20, width: '100%' },
  containerDesktop: { maxWidth: 1100, paddingHorizontal: 76 },
  intro: { gap: 6 },
  title: { color: '#FFF', fontFamily: customerTheme.v4.fontDisplay, fontSize: 34, lineHeight: 38 },
  subtitle: { color: '#FFF', fontFamily: customerTheme.v4.fontBody, fontSize: 17 },
  tabs: { alignItems: 'center', backgroundColor: customerTheme.v4.field, borderRadius: 26, flexDirection: 'row', gap: 4, height: 52, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 22, flex: 1, height: 44, justifyContent: 'center' },
  tabActive: { backgroundColor: customerTheme.v4.surface, ...customerTheme.shadow },
  tabText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 14 },
  tabTextActive: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodyBold },
  list: { flexGrow: 1, gap: 14, overflow: 'visible', paddingBottom: 150, paddingTop: 2 },
  errorCard: { backgroundColor: customerTheme.colors.dangerSurface, borderRadius: 18, padding: 14 },
  errorText: { color: customerTheme.colors.danger, fontSize: 13 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, gap: 16, marginTop: 4, padding: 24, ...customerTheme.shadow },
  emptyIcon: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 50, height: 96, justifyContent: 'center', width: 96 },
  emptyTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 24, lineHeight: 28, textAlign: 'center' },
  emptyText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  primaryAction: { alignItems: 'center', backgroundColor: customerTheme.v4.primary, borderRadius: 28, height: 56, justifyContent: 'center', marginTop: 12, width: '100%' },
  primaryActionText: { color: '#FFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
  appointmentCard: { backgroundColor: '#FFF', borderRadius: 24, gap: 12, overflow: 'visible', padding: 16, ...appointmentShadow },
  summary: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58 },
  servicePhoto: { borderRadius: 16, height: 60, width: 60 },
  summaryText: { flex: 1, gap: 4 },
  serviceName: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 18 },
  providerName: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  dateBar: { alignItems: 'center', backgroundColor: customerTheme.v4.bg, borderRadius: 16, flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: 14 },
  dateText: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 15 },
  statusBadge: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, flexDirection: 'row', gap: 4, marginTop: 4, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontFamily: customerTheme.v4.fontBodySemi, fontSize: 13 },
  statusOpen: { backgroundColor: customerTheme.v4.lilac }, statusOpenText: { color: customerTheme.v4.primary },
  statusDone: { backgroundColor: '#DDF5EA' }, statusDoneText: { color: customerTheme.v4.success },
  statusCanceled: { backgroundColor: '#FDE3E5' }, statusCanceledText: { color: customerTheme.v4.danger },
  statusPast: { backgroundColor: customerTheme.v4.field }, statusPastText: { color: customerTheme.v4.textMuted },
  statusDotHalo: { alignItems: 'center', borderRadius: 7, height: 14, justifyContent: 'center', shadowColor: '#E89B00', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.28, shadowRadius: 4, width: 14 },
  statusDotHaloOpen: { backgroundColor: '#FFF0C7' }, statusDotHaloDone: { backgroundColor: '#DDF3E8' },
  statusDotHaloCanceled: { backgroundColor: customerTheme.colors.dangerSurface }, statusDotHaloPast: { backgroundColor: '#EEE9F4' },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusDotOpen: { backgroundColor: '#E89B00' }, statusDotDone: { backgroundColor: '#17805A' },
  statusDotCanceled: { backgroundColor: customerTheme.colors.danger }, statusDotPast: { backgroundColor: customerTheme.colors.textSecondary },
  details: { gap: 10 }, divider: { backgroundColor: '#EFE7DA', height: 1 },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', minHeight: 20 },
  detailLabel: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  detailValue: { color: customerTheme.colors.text, flex: 1, fontSize: 12, fontWeight: '600', marginLeft: 16, textAlign: 'right' },
  cardActions: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  detailsButton: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 24, flex: 1, flexDirection: 'row', gap: 3, height: 48, justifyContent: 'center' },
  detailsButtonText: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16 },
  cancelButton: { alignItems: 'center', backgroundColor: '#FDE3E5', borderRadius: 24, flex: 1, height: 48, justifyContent: 'center' },
  cancelButtonText: { color: customerTheme.v4.danger, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16 },
  fullPrimaryButton: { alignItems: 'center', backgroundColor: customerTheme.v4.primary, borderRadius: 24, height: 48, justifyContent: 'center' },
  fullPrimaryText: { color: '#FFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16 },
  completedRating: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  completedRatingText: { color: customerTheme.colors.textSecondary, fontSize: 12 }, disabled: { opacity: 0.56 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(46,10,87,0.62)', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  modalText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 16, lineHeight: 22 },
  fieldGroup: { gap: 8 }, fieldLabel: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  reasonInput: { backgroundColor: customerTheme.v4.field, borderRadius: 16, color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBody, fontSize: 17, height: 110, padding: 16, textAlignVertical: 'top' },
  formError: { color: customerTheme.v4.danger, fontFamily: customerTheme.v4.fontBody, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, paddingTop: 4 },
  modalButton: { alignItems: 'center', borderRadius: 28, flex: 1, height: 56, justifyContent: 'center' },
  modalButtonSecondary: { backgroundColor: customerTheme.v4.lilac },
  modalButtonDanger: { backgroundColor: '#FDE7EA' },
  modalButtonPrimary: { backgroundColor: customerTheme.v4.primary, shadowColor: customerTheme.v4.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 8 },
  modalButtonText: { fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
  modalButtonTextSecondary: { color: customerTheme.v4.primary },
  modalButtonTextDanger: { color: customerTheme.v4.danger },
  modalButtonTextPrimary: { color: '#FFF' },
  ratingSelector: { alignItems: 'center', gap: 16 },
  ratingStars: { flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 8, width: '100%' },
  ratingStar: { height: 44, width: 44 },
  ratingHint: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 16 },
  ratingHintSelected: { color: customerTheme.v4.primary },
  ratingScale: { backgroundColor: customerTheme.v4.field, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  scaleText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 14 },
  feedbackButton: { alignItems: 'center', backgroundColor: customerTheme.v4.primary, borderRadius: 28, height: 56, justifyContent: 'center', width: '100%', shadowColor: customerTheme.v4.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 8 },
  feedbackButtonText: { color: '#FFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
});
