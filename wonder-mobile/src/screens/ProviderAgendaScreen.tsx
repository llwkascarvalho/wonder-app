import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { CustomerFormSheet } from '../components/customer/CustomerFormSheet';
import { HeroGlows } from '../components/customer/HeroGlows';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { getCurrentMonthKey, MonthlyAvailabilityCalendar } from '../components/MonthlyAvailabilityCalendar';
import { useAuth } from '../contexts/AuthContext';
import { useResetScrollOnFocus } from '../navigation/useResetScrollOnFocus';
import { atualizarStatusAgendamento, listarAgendamentos, listarServicos, obterPrestadorLogado } from '../services/provider';
import { resolveProfilePhotoUrl } from '../services/profileService';
import { customerTheme } from '../styles/customerTheme';
import { Agendamento, Prestador, Servico } from '../types/provider';

type AgendaTab = 'abertos' | 'finalizados' | 'cancelados';
const C = customerTheme.v4;
const tabs: Array<{ key: AgendaTab; label: string }> = [
  { key: 'abertos', label: 'Em aberto' }, { key: 'finalizados', label: 'Finalizados' }, { key: 'cancelados', label: 'Cancelados' },
];
const openStatuses = ['pendente', 'confirmado'];
const doneStatuses = ['concluido', 'finalizado'];
const statusLabels: Record<string, string> = {
  pendente: 'Pendente', confirmado: 'Agendado', cancelado: 'Cancelado', concluido: 'Concluído', finalizado: 'Finalizado',
};
function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function formatDateLabel(key: string) {
  return dateFromKey(key).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function extractBackendMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export function ProviderAgendaScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useResetScrollOnFocus(scrollRef);
  const { usuario } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 900;
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

  const servicosById = useMemo(() => Object.fromEntries(servicos.map(servico => [servico.id, servico])) as Record<number, Servico>, [servicos]);
  const visibleAppointments = useMemo(() => agendamentos.filter(item =>
    activeTab === 'abertos' ? openStatuses.includes(item.status) :
    activeTab === 'cancelados' ? item.status === 'cancelado' : doneStatuses.includes(item.status)
  ), [activeTab, agendamentos]);
  const counts = useMemo(() => [
    agendamentos.filter(item => openStatuses.includes(item.status)).length,
    agendamentos.filter(item => doneStatuses.includes(item.status)).length,
    agendamentos.filter(item => item.status === 'cancelado').length,
  ], [agendamentos]);
  const dateTitle = activeTab === 'abertos' ? 'Agendados' : activeTab === 'finalizados' ? 'Finalizados' : 'Cancelados';

  const loadAgenda = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const next = await listarAgendamentos(selectedDate);
      setAgendamentos(next);
      if (usuario?.id) {
        const found = await obterPrestadorLogado();
        setPrestador(found);
        setServicos(found ? await listarServicos(found.id) : []);
      }
    } catch {
      setAgendamentos([]);
      setError('Não foi possível carregar os agendamentos.');
    } finally { setLoading(false); }
  }, [selectedDate, usuario?.id]);
  useEffect(() => { loadAgenda(); }, [loadAgenda]);

  async function handleStatus(id: number, status: string, motivo?: string) {
    setSavingId(id); setError('');
    try {
      await atualizarStatusAgendamento(id, status, motivo);
      setAgendamentos(await listarAgendamentos(selectedDate));
      return true;
    } catch (caught) {
      setError(extractBackendMessage(caught, 'Não foi possível atualizar o agendamento.'));
      return false;
    } finally { setSavingId(null); }
  }
  async function confirmCancel() {
    if (!cancelTarget) return;
    const motivo = cancelMotivo.trim();
    if (!motivo) { setError('Informe o motivo do cancelamento.'); return; }
    if (await handleStatus(cancelTarget.id, 'cancelado', motivo)) {
      setCancelTarget(null); setCancelMotivo('');
    }
  }
  if (loading && agendamentos.length === 0 && !error) return <LoadingIndicator text="Carregando agendamentos..." />;

  return <View style={styles.screen}>
    <ScrollView ref={scrollRef} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAgenda} />}
      contentContainerStyle={{ paddingBottom: desktop ? 60 : 150 }}>
      <View style={[styles.hero, { paddingTop: desktop ? 44 : Math.max(insets.top, 56), paddingHorizontal: desktop ? 76 : 20 }]}>
        <HeroGlows desktop={desktop} />
        <View style={styles.heroTop}>
          <CatalogImage fotoUrl={prestador?.foto_url} kind="provider" style={styles.heroAvatar} />
          <View style={styles.heroIdentity}>
            <Text style={styles.heroGreeting} numberOfLines={1}>Olá, {usuario?.nome?.trim().split(/\s+/)[0] || 'prestador'}!</Text>
            <Text style={styles.heroRole}>Painel Wonder</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Agenda</Text>
        <Text style={styles.heroSubtitle}>Acompanhe os atendimentos do dia.</Text>
      </View>
      <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
        <View style={[styles.content, { paddingHorizontal: width >= 640 ? 32 : 20 }, desktop && styles.contentDesktop]}>
          <View style={[styles.layout, desktop && styles.layoutDesktop]}>
            <View style={styles.mainColumn}>
              <View style={styles.segment} accessibilityRole="tablist">
                {tabs.map(tab => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.key }}
                  onPress={() => { setActiveTab(tab.key); scrollRef.current?.scrollTo({ y: 0, animated: false }); }}
                  style={[styles.segmentButton, activeTab === tab.key && styles.segmentActive]}>
                  <Text numberOfLines={1} style={[styles.segmentText, activeTab === tab.key && styles.segmentTextActive]}>{tab.label}</Text>
                </Pressable>)}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Escolher outra data" onPress={() => setCalendarVisible(true)} style={styles.dateCard}>
                <View style={styles.dateInfo}><Text style={styles.dateCaption}>{dateTitle} em</Text>
                  <Text style={styles.dateValue} numberOfLines={2}>{formatDateLabel(selectedDate)}</Text></View>
                <View style={styles.calendarIcon}><Ionicons name="calendar-outline" size={24} color="#FFF" /></View>
              </Pressable>
              {error ? <View style={styles.errorCard}><Text style={styles.error}>{error}</Text>
                <Button appearance="customer" title="Tentar novamente" variant="secondary" onPress={loadAgenda} /></View> : null}
              {visibleAppointments.length ? visibleAppointments.map(item => <AppointmentCard key={item.id}
                agendamento={item} servico={servicosById[item.servico_id]} saving={savingId === item.id}
                onConfirm={() => handleStatus(item.id, 'confirmado')} onFinish={() => handleStatus(item.id, 'concluido')}
                onCancel={() => { setError(''); setCancelMotivo(''); setCancelTarget(item); }} />) : !error ?
                <View style={styles.emptyCard}><View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={28} color={C.primary} /></View>
                  <Text style={styles.emptyTitle}>{activeTab === 'abertos' ? 'Nenhum atendimento em aberto' : activeTab === 'finalizados' ? 'Nada finalizado neste dia' : 'Nenhum cancelamento neste dia'}</Text>
                  <Text style={styles.emptyText}>{activeTab === 'abertos' ? 'Quando um cliente agendar, o atendimento aparecerá aqui.' : 'Os atendimentos desta etapa aparecerão aqui.'}</Text></View> : null}
            </View>
            {desktop ? <View style={styles.aside}><Text style={styles.asideTitle}>Resumo do dia</Text>
              <Text style={styles.dateCaption}>{formatDateLabel(selectedDate)}</Text>
              <View style={styles.stats}>{tabs.map((tab, index) => <View key={tab.key} style={styles.stat}>
                <Text style={styles.statNumber}>{counts[index]}</Text><Text style={styles.statLabel}>{tab.label}</Text></View>)}</View>
              <Button appearance="customer" title="Escolher outra data" variant="secondary" onPress={() => setCalendarVisible(true)} /></View> : null}
          </View>
        </View>
      </View>
    </ScrollView>
    <CustomerFormSheet visible={calendarVisible} title="Escolher data" onClose={() => setCalendarVisible(false)}>
      <MonthlyAvailabilityCalendar mes={calendarMonth} diasDisponiveis={[]} dataSelecionada={selectedDate}
        allowUnavailableSelection onChangeMes={setCalendarMonth} onSelectDate={key => { setSelectedDate(key); setCalendarVisible(false); }} />
    </CustomerFormSheet>
    <CustomerFormSheet visible={cancelTarget !== null} title="Cancelar atendimento" disabled={savingId !== null}
      onClose={() => { if (savingId === null) { setCancelTarget(null); setCancelMotivo(''); setError(''); } }}>
      <Text style={styles.modalText}>Informe o motivo do cancelamento. A disponibilidade pode depender da antecedência do atendimento.</Text>
      <TextInput multiline maxLength={100} editable={savingId === null} placeholder="Motivo do cancelamento"
        placeholderTextColor={C.textMuted} value={cancelMotivo} onChangeText={setCancelMotivo} style={styles.reasonInput} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.modalActions}>
        <Button appearance="customer" title="Voltar" variant="secondary" onPress={() => { setCancelTarget(null); setCancelMotivo(''); setError(''); }} disabled={savingId !== null} />
        <Button appearance="customer" title={savingId === null ? 'Confirmar cancelamento' : 'Cancelando...'} variant="danger" onPress={confirmCancel} disabled={savingId !== null} />
      </View>
    </CustomerFormSheet>
  </View>;
}

function AppointmentCard({ agendamento, servico, saving, onConfirm, onFinish, onCancel }: {
  agendamento: Agendamento; servico?: Servico; saving: boolean;
  onConfirm: () => void; onFinish: () => void; onCancel: () => void;
}) {
  const start = new Date(agendamento.inicio);
  const dateLabel = Number.isNaN(start.getTime()) ? agendamento.inicio :
    `${start.toLocaleDateString('pt-BR')} · ${start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const photo = resolveProfilePhotoUrl(agendamento.cliente_foto_url);
  const active = openStatuses.includes(agendamento.status);
  return <View style={styles.appointmentCard}>
    <View style={styles.appointmentTop}>
      <View style={styles.avatar}>{photo ? <Image source={{ uri: photo }} style={styles.avatarImage} /> :
        <Text style={styles.avatarText}>{agendamento.cliente_nome?.trim().slice(0, 1).toUpperCase() || 'C'}</Text>}</View>
      <View style={styles.appointmentInfo}><Text style={styles.appointmentTitle} numberOfLines={2}>{servico?.nome || `Serviço ${agendamento.servico_id}`}</Text>
        <Text style={styles.clientName} numberOfLines={2}>{agendamento.cliente_nome || `Cliente ${agendamento.cliente_id}`}</Text></View>
      <View style={[styles.statusPill, agendamento.status === 'cancelado' ? styles.statusDanger :
        doneStatuses.includes(agendamento.status) ? styles.statusSuccess : styles.statusPending]}>
        <Text style={styles.statusText}>{statusLabels[agendamento.status] ?? agendamento.status}</Text></View>
    </View>
    <View style={styles.when}><Ionicons name="calendar-outline" size={19} color={C.primary} /><Text style={styles.whenText}>{dateLabel}</Text></View>
    {active ? <View style={styles.actions}>
      <View style={styles.actionSlot}><Button appearance="customer" title={agendamento.status === 'pendente' ? 'Confirmar' : 'Finalizar'}
        onPress={agendamento.status === 'pendente' ? onConfirm : onFinish} loading={saving} /></View>
      <View style={styles.actionSlot}><Button appearance="customer" title="Cancelar" variant="danger" onPress={onCancel} disabled={saving} /></View>
    </View> : null}
  </View>;
}

const shadow = { shadowColor: C.primaryDeep, shadowOffset: { width: 0, height: 6 }, shadowOpacity: .08, shadowRadius: 20, elevation: 3 } as const;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  hero: { backgroundColor: C.primary, minHeight: 176, overflow: 'hidden', paddingBottom: 56 },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 16 },
  heroAvatar: { borderRadius: 22, height: 44, width: 44 },
  heroIdentity: { flex: 1, minWidth: 0 },
  heroGreeting: { color: '#FFF', fontFamily: C.fontBodyBold, fontSize: 18, lineHeight: 22 },
  heroRole: { color: '#FFF', fontFamily: C.fontBody, fontSize: 14, lineHeight: 19, opacity: .8 },
  heroTitle: { color: '#FFF', fontFamily: C.fontDisplay, fontSize: 34, lineHeight: 38 },
  heroSubtitle: { color: '#FFF', fontFamily: C.fontBody, fontSize: 17, lineHeight: 23, marginTop: 6 },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, minHeight: 500 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40 },
  content: { paddingTop: 24 }, contentDesktop: { paddingTop: 32, paddingHorizontal: 76 },
  layout: { gap: 32 }, layoutDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  mainColumn: { flex: 1, gap: 16, minWidth: 0 },
  segment: { alignItems: 'center', backgroundColor: C.field, borderRadius: 26, flexDirection: 'row', gap: 4, minHeight: 52, padding: 4 },
  segmentButton: { alignItems: 'center', borderRadius: 22, flex: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 3 },
  segmentActive: { backgroundColor: C.primary },
  segmentText: { color: C.textMuted, fontFamily: C.fontBodySemi, fontSize: 13, textAlign: 'center' },
  segmentTextActive: { color: '#FFF' },
  dateCard: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 20, flexDirection: 'row', gap: 14, padding: 16, ...shadow },
  dateInfo: { flex: 1 }, dateCaption: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 14, lineHeight: 20 },
  dateValue: { color: C.text, fontFamily: C.fontDisplay, fontSize: 19, lineHeight: 23 },
  calendarIcon: { alignItems: 'center', backgroundColor: C.primary, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  appointmentCard: { backgroundColor: C.surface, borderRadius: 24, gap: 14, padding: 16, ...shadow },
  appointmentTop: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { alignItems: 'center', backgroundColor: C.primary, borderRadius: 28, height: 56, justifyContent: 'center', overflow: 'hidden', width: 56 },
  avatarImage: { height: 56, width: 56 }, avatarText: { color: '#FFF', fontFamily: C.fontDisplay, fontSize: 20 },
  appointmentInfo: { flex: 1, minWidth: 0 }, appointmentTitle: { color: C.text, fontFamily: C.fontDisplay, fontSize: 19, lineHeight: 23 },
  clientName: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 15, lineHeight: 20 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusPending: { backgroundColor: '#FFF0C7' }, statusSuccess: { backgroundColor: '#DDF3E8' }, statusDanger: { backgroundColor: '#FDE3E5' },
  statusText: { color: C.text, fontFamily: C.fontBodySemi, fontSize: 12 },
  when: { alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  whenText: { color: C.text, fontFamily: C.fontBodyBold, fontSize: 16, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 12 }, actionSlot: { flex: 1, minWidth: 0 },
  emptyCard: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, gap: 8, padding: 28, ...shadow },
  emptyIcon: { alignItems: 'center', backgroundColor: C.lilac, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  emptyTitle: { color: C.text, fontFamily: C.fontDisplay, fontSize: 20, textAlign: 'center' },
  emptyText: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  aside: { backgroundColor: C.surface, borderRadius: 24, gap: 16, padding: 20, width: 340, ...shadow },
  asideTitle: { color: C.text, fontFamily: C.fontDisplay, fontSize: 22 }, stats: { flexDirection: 'row', gap: 8 },
  stat: { alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, flex: 1, gap: 4, padding: 8 },
  statNumber: { color: C.primary, fontFamily: C.fontDisplay, fontSize: 24 },
  statLabel: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 12, textAlign: 'center' },
  errorCard: { backgroundColor: '#FDE3E5', borderRadius: 18, gap: 10, padding: 16 },
  error: { color: C.danger, fontFamily: C.fontBodySemi, fontSize: 15, lineHeight: 21 },
  modalText: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 16, lineHeight: 23 },
  reasonInput: { backgroundColor: C.field, borderRadius: 16, color: C.text, fontFamily: C.fontBody, fontSize: 16, minHeight: 100, padding: 14, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12 },
});
