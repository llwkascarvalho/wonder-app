import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { A, AdminAction, AdminChip, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { AdminBookingsChart } from '../../components/admin/AdminBookingsChart';
import { AdminExportFeedback, AdminExportFeedbackState } from '../../components/admin/AdminExportFeedback';
import { mensagemErroExportacaoAdmin, obterAgendamentosAdmin, solicitarExportacaoAdmin } from '../../services/admin';
import { AdminDashboardAgendamentos } from '../../types/admin';

type Periodo = '7 dias' | '15 dias' | 'Mês' | 'Personalizado';
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function AdminReportScreen() {
  const navigation = useNavigation();
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [periodo, setPeriodo] = useState<Periodo>('Mês');
  const [inicioManual, setInicioManual] = useState('');
  const [fimManual, setFimManual] = useState('');
  const [relatorio, setRelatorio] = useState<AdminDashboardAgendamentos | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState<AdminExportFeedbackState>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const intervalo = useMemo(() => {
    if (periodo === 'Personalizado') return { data_inicio: inicioManual, data_fim: fimManual };
    const hoje = new Date();
    const fim = mes.getFullYear() === hoje.getFullYear() && mes.getMonth() === hoje.getMonth()
      ? hoje : new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    const inicio = periodo === 'Mês' ? new Date(mes) :
      new Date(Math.max(mes.getTime(), new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - (periodo === '7 dias' ? 6 : 14)).getTime()));
    return { data_inicio: iso(inicio), data_fim: iso(fim) };
  }, [mes, periodo, inicioManual, fimManual]);

  const carregar = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(intervalo.data_inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(intervalo.data_fim) ||
      intervalo.data_inicio > intervalo.data_fim) {
      setErro('Informe um período válido no formato AAAA-MM-DD.');
      return;
    }
    setCarregando(true); setErro('');
    try {
      const dados = await obterAgendamentosAdmin(intervalo.data_inicio, intervalo.data_fim);
      setRelatorio(dados);
      setSelecionado(dados.dias.reduce<string | null>((melhor, dia) => {
        const atual = dados.dias.find(item => item.data === melhor);
        return !atual || dia.total_agendamentos > atual.total_agendamentos ? dia.data : melhor;
      }, null));
    } catch { setErro('Não foi possível carregar os agendamentos deste período.'); }
    finally { setCarregando(false); }
  }, [intervalo.data_inicio, intervalo.data_fim]);

  useEffect(() => { if (periodo !== 'Personalizado') void carregar(); }, [carregar, periodo]);

  async function exportar() {
    if (!relatorio || exportando) return;
    setExportando(true); setFeedback(null);
    try {
      await solicitarExportacaoAdmin('agendamentos', {
        data_inicio: relatorio.data_inicio, data_fim: relatorio.data_fim,
      });
      setFeedback({ kind: 'success' });
    } catch (error) { setFeedback({ kind: 'error', message: mensagemErroExportacaoAdmin(error) }); }
    finally { setExportando(false); }
  }

  const rotuloMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return <><AdminPage title="Agendamentos" subtitle="Volume de atendimentos por período." back={() => navigation.goBack()} wide>
    <View style={[adminV4.card, styles.monthbar]}>
      <Pressable accessibilityLabel="Mês anterior" onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} style={styles.monthButton}>
        <Ionicons name="chevron-back" size={22} color={A.primary} />
      </Pressable>
      <Text style={styles.month}><Ionicons name="calendar-outline" size={20} color={A.primary} />  {rotuloMes}</Text>
      <Pressable accessibilityLabel="Próximo mês" onPress={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} style={styles.monthButton}>
        <Ionicons name="chevron-forward" size={22} color={A.primary} />
      </Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {(['7 dias', '15 dias', 'Mês', 'Personalizado'] as Periodo[]).map(item =>
        <AdminChip key={item} label={item} active={periodo === item} onPress={() => setPeriodo(item)} />)}
    </ScrollView>
    {periodo === 'Personalizado' ? <View style={[adminV4.card, styles.custom]}>
      <Text style={adminV4.muted}>Datas no formato AAAA-MM-DD</Text>
      <View style={styles.customInputs}>
        <TextInput accessibilityLabel="Data inicial" placeholder="Início" placeholderTextColor={A.textMuted} value={inicioManual} onChangeText={setInicioManual} style={styles.dateInput} />
        <TextInput accessibilityLabel="Data final" placeholder="Fim" placeholderTextColor={A.textMuted} value={fimManual} onChangeText={setFimManual} style={styles.dateInput} />
      </View>
      <AdminAction label="Aplicar período" compact onPress={() => { void carregar(); }} />
    </View> : null}
    {erro ? <AdminMessage danger>{erro}</AdminMessage> : null}
    <View style={[adminV4.card, styles.metrics]}>
      <View style={styles.metric}><Text style={styles.metricValue}>{carregando ? '…' : relatorio?.total_agendamentos ?? '—'}</Text><Text style={adminV4.muted}>Agendamentos</Text></View>
      <View style={[styles.metric, styles.metricBorder]}><Text style={styles.metricValue}>{carregando ? '…' : Number(relatorio?.media_por_dia ?? 0).toLocaleString('pt-BR')}</Text><Text style={adminV4.muted}>Média por dia</Text></View>
    </View>
    <View style={styles.sectionTitle}><Text style={adminV4.heading}>Visão do período</Text>
      <AdminAction label={exportando ? 'Solicitando…' : 'Exportar CSV'} kind="secondary" compact disabled={!relatorio || exportando} onPress={() => { void exportar(); }} />
    </View>
    <View style={[adminV4.card, styles.chartCard]}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Agendamentos por dia</Text>
        <View style={styles.totalLegend}><View style={styles.totalDot} /><Text style={styles.totalLabel}>Total</Text></View>
      </View>
      <AdminBookingsChart dias={relatorio?.dias ?? []} selecionado={selecionado} onSelect={setSelecionado} />
      <View style={styles.legend}>
        <View style={[styles.legendItem, styles.legendScheduled]}><View style={[styles.legendDot, { backgroundColor: A.primary }]} />
          <Text style={styles.scheduledText}><Text style={styles.legendValue}>{(relatorio?.totais_por_status.pendente ?? 0) + (relatorio?.totais_por_status.confirmado ?? 0)}</Text>  Agendados</Text></View>
        <View style={[styles.legendItem, styles.legendDone]}><View style={[styles.legendDot, { backgroundColor: A.success }]} />
          <Text style={styles.doneText}><Text style={styles.legendValue}>{relatorio?.totais_por_status.concluido ?? 0}</Text>  Finalizados</Text></View>
        <View style={[styles.legendItem, styles.legendCanceled]}><View style={[styles.legendDot, { backgroundColor: A.danger }]} />
          <Text style={styles.canceledText}><Text style={styles.legendValue}>{relatorio?.totais_por_status.cancelado ?? 0}</Text>  Cancelados</Text></View>
      </View>
    </View>
    <AdminMessage>Dados exibidos de forma agregada para proteger a privacidade.</AdminMessage>
  </AdminPage>
    <AdminExportFeedback feedback={feedback} onClose={() => setFeedback(null)} />
  </>;
}

const styles = StyleSheet.create({
  monthbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 },
  monthButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: A.field, alignItems: 'center', justifyContent: 'center' },
  month: { color: A.text, fontFamily: A.fontDisplay, fontSize: 19, textTransform: 'capitalize' },
  chips: { gap: 10, paddingVertical: 2 }, custom: { gap: 12 }, customInputs: { flexDirection: 'row', gap: 10 },
  dateInput: { flex: 1, minWidth: 0, height: 52, borderRadius: 16, paddingHorizontal: 12, backgroundColor: A.field,
    color: A.text, fontFamily: A.fontBody, fontSize: 15 },
  metrics: { flexDirection: 'row', padding: 0 }, metric: { flex: 1, gap: 2, padding: 18 },
  metricBorder: { borderLeftWidth: 1, borderLeftColor: A.border },
  metricValue: { fontFamily: A.fontDisplay, fontSize: 34, color: A.text },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chartCard: { gap: 14 }, chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chartTitle: { color: A.text, fontFamily: A.fontBodyBold, fontSize: 17 },
  totalLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 }, totalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: A.primary },
  totalLabel: { color: A.textMuted, fontFamily: A.fontBody, fontSize: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, paddingHorizontal: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4 }, legendValue: { fontFamily: A.fontBodyBold, fontSize: 14 },
  scheduledText: { color: A.primary, fontFamily: A.fontBodySemi, fontSize: 13 },
  doneText: { color: A.success, fontFamily: A.fontBodySemi, fontSize: 13 },
  canceledText: { color: A.danger, fontFamily: A.fontBodySemi, fontSize: 13 },
  legendScheduled: { backgroundColor: A.lilac },
  legendDone: { backgroundColor: '#DDF5EA' },
  legendCanceled: { backgroundColor: '#FDE7EA' },
});
