import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatalogImage } from '../components/catalog/CatalogImage';
import { RatingStars } from '../components/catalog/RatingStars';
import { CustomerHeader } from '../components/customer/CustomerHeader';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { atualizarStatusAgendamento, extrairMensagemErro, listarAgendamentos } from '../services/agendamentos';
import { criarAvaliacaoPrestador, listarAvaliacoesPrestador } from '../services/avaliacoes';
import { listarServicosPrestador, obterPrestador } from '../services/catalogo';
import { customerTheme } from '../styles/customerTheme';
import { Agendamento } from '../types/agendamento';
import { Avaliacao } from '../types/avaliacao';
import { Prestador, Servico } from '../types/catalogo';
import { podeAvaliarAgendamento } from '../utils/avaliacoes';

type AgendaTab = 'agendados' | 'finalizados' | 'cancelados';
type FeedbackModal = 'cancelado' | 'avaliado' | null;
type AgendamentoEnriquecido = {
  agendamento: Agendamento;
  prestador?: Prestador;
  servico?: Servico;
  avaliacao?: Avaliacao;
  avaliacoesCarregadas: boolean;
};

const tabs: Array<{ key: AgendaTab; label: string }> = [
  { key: 'agendados', label: 'Agendados' },
  { key: 'finalizados', label: 'Finalizados' },
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

function filtrarPorAba(item: AgendamentoEnriquecido, aba: AgendaTab) {
  const status = item.agendamento.status;
  if (aba === 'agendados') return agendadosStatuses.has(status);
  if (aba === 'finalizados') return finalizadosStatuses.has(status);
  return canceladosStatuses.has(status);
}

export function AppointmentsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AgendaTab>('agendados');
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
    () => agendamentos.filter((item) => filtrarPorAba(item, activeTab)),
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
      setActiveTab('finalizados');
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
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
        <CustomerHeader />
        <View style={styles.intro}>
          <Text style={styles.title}>Agendamentos</Text>
          <Text style={styles.subtitle}>Acompanhe seus horários.</Text>
        </View>
        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable key={tab.key} accessibilityRole="button" onPress={() => {
                setActiveTab(tab.key);
                setDetalheId(null);
              }} style={[styles.tab, selected && styles.tabActive]}>
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {erro ? <View style={styles.errorCard}><Text style={styles.errorText}>{erro}</Text></View> : (
          <FlatList
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

      <Modal transparent visible={cancelTarget !== null} animationType="fade" onRequestClose={fecharCancelamento}>
        <View style={styles.modalBackdrop}>
          <View style={styles.formModal}>
            <Text style={styles.modalTitle}>Cancelar agendamento</Text>
            <Text style={styles.modalText}>Informe o motivo. O cancelamento não será permitido próximo do atendimento.</Text>
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
          </View>
        </View>
      </Modal>

      <Modal transparent visible={avaliacaoTarget !== null} animationType="fade" onRequestClose={fecharAvaliacao}>
        <View style={styles.modalBackdrop}>
          <View style={styles.formModal}>
            <Text style={styles.modalTitle}>Avaliar atendimento</Text>
            <Text style={styles.modalText}>Como foi seu atendimento com {avaliacaoTarget?.prestador?.nome_estab ?? 'este prestador'}?</Text>
            <View style={styles.ratingSelector}>
              <RatingStars value={notaAvaliacao} onChange={(nota) => {
                setNotaAvaliacao(nota);
                setAvaliacaoErro(null);
              }} disabled={avaliandoId !== null} size={38} />
              <Text style={[styles.ratingHint, notaAvaliacao > 0 && styles.ratingHintSelected]}>
                {notaAvaliacao > 0 ? `${notaAvaliacao} de 5 estrelas` : 'Selecione uma nota'}
              </Text>
            </View>
            <View style={styles.ratingScale}><Text style={styles.scaleText}>1 = Péssimo</Text><Text style={styles.scaleText}>5 = Ótimo</Text></View>
            {avaliacaoErro ? <Text style={styles.formError}>{avaliacaoErro}</Text> : null}
            <View style={styles.modalActions}>
              <ModalButton label="Voltar" onPress={fecharAvaliacao} disabled={avaliandoId !== null} variant="secondary" />
              <ModalButton label={avaliandoId !== null ? 'Enviando...' : 'Enviar avaliação'} onPress={enviarAvaliacao} disabled={avaliandoId !== null} variant="primary" />
            </View>
          </View>
        </View>
      </Modal>
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
  const cancelavel = cancelaveisStatuses.has(agendamento.status);
  const avaliavel = podeAvaliarAgendamento(agendamento.status, avaliacoesCarregadas, avaliacao);
  const statusLabel = STATUS_LABEL[agendamento.status] ?? agendamento.status;
  return (
    <View style={styles.appointmentCard}>
      <View style={styles.summary}>
        <CatalogImage fotoUrl={servico?.foto_url} kind="service" style={styles.servicePhoto} />
        <View style={styles.summaryText}>
          <Text style={styles.serviceName} numberOfLines={1}>{servico?.nome ?? `Serviço ${agendamento.servico_id}`}</Text>
          <Text style={styles.providerName} numberOfLines={1}>{prestador?.nome_estab ?? `Prestador ${agendamento.prestador_id}`}</Text>
          <Text style={styles.dateText}>{data} · {horario}</Text>
        </View>
        <View style={[styles.statusBadge, statusStyle(agendamento.status)]}>
          <Text style={[styles.statusText, statusTextStyle(agendamento.status)]}>{statusLabel}</Text>
        </View>
      </View>
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
      <View style={styles.modalBackdrop}><View accessibilityRole="alert" style={styles.feedbackModal}>
        <View style={[styles.feedbackIcon, canceled && styles.feedbackIconDanger]}><MaterialIcons name={canceled ? 'close' : 'check'} size={28} color={canceled ? customerTheme.colors.danger : '#17805A'} /></View>
        <Text style={styles.feedbackTitle}>{canceled ? 'Agendamento cancelado' : 'Avaliação enviada!'}</Text>
        <Text style={styles.feedbackText}>{canceled ? 'O agendamento foi movido para Cancelados.' : 'Obrigado por avaliar este atendimento.'}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.feedbackButton}><Text style={styles.feedbackButtonText}>OK</Text></Pressable>
      </View></View>
    </Modal>
  );
}

function statusStyle(status: string) {
  if (canceladosStatuses.has(status)) return styles.statusCanceled;
  if (finalizadosStatuses.has(status)) return styles.statusDone;
  return styles.statusOpen;
}
function statusTextStyle(status: string) {
  if (canceladosStatuses.has(status)) return styles.statusCanceledText;
  if (finalizadosStatuses.has(status)) return styles.statusDoneText;
  return styles.statusOpenText;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.colors.background, flex: 1 },
  loading: { alignItems: 'center', backgroundColor: customerTheme.colors.background, flex: 1, justifyContent: 'center' },
  container: { alignSelf: 'center', flex: 1, gap: 14, maxWidth: 560, paddingHorizontal: 20, width: '100%' },
  intro: { gap: 2, marginTop: 2 },
  title: { color: customerTheme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: customerTheme.colors.textSecondary, fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: 999, height: 36, justifyContent: 'center', paddingHorizontal: 13 },
  tabActive: { backgroundColor: customerTheme.colors.brandDark },
  tabText: { color: customerTheme.colors.text, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: customerTheme.colors.textOnBrand },
  list: { flexGrow: 1, gap: 12, paddingBottom: 110 },
  errorCard: { backgroundColor: customerTheme.colors.dangerSurface, borderRadius: 18, padding: 14 },
  errorText: { color: customerTheme.colors.danger, fontSize: 13 },
  emptyCard: { alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: 22, gap: 14, marginTop: 4, padding: 24, ...customerTheme.shadow },
  emptyIcon: { alignItems: 'center', backgroundColor: '#EFE7DA', borderRadius: 18, height: 64, justifyContent: 'center', width: 64 },
  emptyTitle: { color: customerTheme.colors.text, fontSize: 19, fontWeight: '800', lineHeight: 22, textAlign: 'center' },
  emptyText: { color: customerTheme.colors.textSecondary, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  primaryAction: { alignItems: 'center', backgroundColor: customerTheme.colors.brand, borderRadius: 999, height: 44, justifyContent: 'center', width: '100%' },
  primaryActionText: { color: customerTheme.colors.textOnBrand, fontSize: 14, fontWeight: '600' },
  appointmentCard: { backgroundColor: customerTheme.colors.surface, borderRadius: 22, gap: 12, padding: 14, ...customerTheme.shadow },
  summary: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 64 },
  servicePhoto: { borderRadius: 18, height: 56, width: 56 },
  summaryText: { flex: 1, gap: 3 },
  serviceName: { color: customerTheme.colors.text, fontSize: 14, fontWeight: '600' },
  providerName: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  dateText: { color: customerTheme.colors.text, fontSize: 12, fontWeight: '600' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusOpen: { backgroundColor: '#FFF0C7' }, statusOpenText: { color: '#9A6700' },
  statusDone: { backgroundColor: '#DDF3E8' }, statusDoneText: { color: '#17805A' },
  statusCanceled: { backgroundColor: customerTheme.colors.dangerSurface }, statusCanceledText: { color: customerTheme.colors.danger },
  details: { gap: 10 }, divider: { backgroundColor: '#EFE7DA', height: 1 },
  detailRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', minHeight: 20 },
  detailLabel: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  detailValue: { color: customerTheme.colors.text, flex: 1, fontSize: 12, fontWeight: '600', marginLeft: 16, textAlign: 'right' },
  cardActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  detailsButton: { alignItems: 'center', flexDirection: 'row', gap: 3, justifyContent: 'center', minHeight: 42 },
  detailsButtonText: { color: customerTheme.colors.brand, fontSize: 12, fontWeight: '600' },
  cancelButton: { alignItems: 'center', backgroundColor: customerTheme.colors.dangerSurface, borderRadius: 999, justifyContent: 'center', minHeight: 41, paddingHorizontal: 18 },
  cancelButtonText: { color: customerTheme.colors.danger, fontSize: 14, fontWeight: '600' },
  fullPrimaryButton: { alignItems: 'center', backgroundColor: customerTheme.colors.brand, borderRadius: 999, height: 44, justifyContent: 'center' },
  fullPrimaryText: { color: customerTheme.colors.textOnBrand, fontSize: 14, fontWeight: '600' },
  completedRating: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  completedRatingText: { color: customerTheme.colors.textSecondary, fontSize: 12 }, disabled: { opacity: 0.56 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(36,16,46,0.52)', flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  formModal: { backgroundColor: customerTheme.colors.surface, borderRadius: 24, gap: 16, maxWidth: 335, padding: 24, width: '100%', ...customerTheme.shadow },
  modalTitle: { color: customerTheme.colors.text, fontSize: 24, fontWeight: '800', lineHeight: 29 },
  modalText: { color: customerTheme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  fieldGroup: { gap: 7 }, fieldLabel: { color: customerTheme.colors.text, fontSize: 13, fontWeight: '600' },
  reasonInput: { backgroundColor: '#EFE7DA', borderRadius: 14, color: customerTheme.colors.text, minHeight: 96, padding: 14, textAlignVertical: 'top' },
  formError: { color: customerTheme.colors.danger, fontSize: 12 }, modalActions: { flexDirection: 'row', gap: 10 },
  modalButton: { alignItems: 'center', borderRadius: 24, flex: 1, height: 48, justifyContent: 'center' },
  modalButtonSecondary: { backgroundColor: '#EFE3FA' }, modalButtonDanger: { backgroundColor: customerTheme.colors.dangerSurface }, modalButtonPrimary: { backgroundColor: customerTheme.colors.brand },
  modalButtonText: { fontSize: 15, fontWeight: '600' }, modalButtonTextSecondary: { color: customerTheme.colors.brandDark }, modalButtonTextDanger: { color: customerTheme.colors.danger }, modalButtonTextPrimary: { color: customerTheme.colors.textOnBrand },
  ratingSelector: { alignItems: 'center', gap: 10 }, ratingHint: { color: customerTheme.colors.textSecondary, fontSize: 13, fontWeight: '600' }, ratingHintSelected: { color: customerTheme.colors.brand },
  ratingScale: { backgroundColor: '#EFE7DA', borderRadius: 12, flexDirection: 'row', height: 36, justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 11 }, scaleText: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  feedbackModal: { alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: 24, gap: 16, maxWidth: 319, padding: 24, width: '100%', ...customerTheme.shadow },
  feedbackIcon: { alignItems: 'center', backgroundColor: '#DDF3E8', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 }, feedbackIconDanger: { backgroundColor: customerTheme.colors.dangerSurface },
  feedbackTitle: { color: customerTheme.colors.text, fontSize: 24, fontWeight: '800', lineHeight: 29, textAlign: 'center' }, feedbackText: { color: customerTheme.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  feedbackButton: { alignItems: 'center', backgroundColor: customerTheme.colors.brand, borderRadius: 24, height: 48, justifyContent: 'center', width: '100%' }, feedbackButtonText: { color: customerTheme.colors.textOnBrand, fontSize: 15, fontWeight: '600' },
});
