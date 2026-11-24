import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { A, AdminAction, AdminChip, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { AdminExportFeedback, AdminExportFeedbackState } from '../../components/admin/AdminExportFeedback';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { AdminHomeStackParamList } from '../../navigation/AdminTabs';
import { listarPrestadoresAdmin, mensagemErroExportacaoAdmin, solicitarExportacaoAdmin } from '../../services/admin';
import { AdminPrestadoresPagina } from '../../types/admin';

type Nav = NativeStackNavigationProp<AdminHomeStackParamList, 'AdminProvidersDirectory'>;
type Route = RouteProp<AdminHomeStackParamList, 'AdminProvidersDirectory'>;

const statusOptions = [
  { label: 'Todos', value: '' }, { label: 'Aprovados', value: 'ativo' },
  { label: 'Pendentes', value: 'pendente' }, { label: 'Rejeitados', value: 'rejeitado' },
  { label: 'Suspensos', value: 'suspenso' },
];

export function AdminProvidersDirectoryScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const route = useRoute<Route>();
  const pending = !!route.params?.pending;
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [filtro, setFiltro] = useState(pending ? 'pendente' : '');
  const [periodo, setPeriodo] = useState<'Todos' | 'Últimos 7 dias' | 'Este mês'>('Todos');
  const [inicio, setInicio] = useState(0);
  const [pagina, setPagina] = useState<AdminPrestadoresPagina | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState('');
  const [feedback, setFeedback] = useState<AdminExportFeedbackState>(null);
  const requisicao = useRef(0);

  useEffect(() => { const timer = setTimeout(() => { setInicio(0); setBuscaAplicada(busca.trim()); }, 350); return () => clearTimeout(timer); }, [busca]);
  const datas = useMemo(() => {
    if (!pending || periodo === 'Todos') return {};
    const hoje = new Date();
    const inicioData = periodo === 'Este mês' ? new Date(hoje.getFullYear(), hoje.getMonth(), 1) :
      new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6);
    const format = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    return { data_inicio: format(inicioData), data_fim: format(hoje) };
  }, [pending, periodo]);
  const params = useMemo(() => ({ busca: buscaAplicada, status: pending ? 'pendente' : filtro || undefined, ...datas }),
    [buscaAplicada, pending, filtro, datas]);

  const carregar = useCallback(async () => {
    const atual = ++requisicao.current;
    setCarregando(true); setErro('');
    try { const dados = await listarPrestadoresAdmin({ ...params, inicio }); if (atual === requisicao.current) setPagina(dados); }
    catch { if (atual === requisicao.current) setErro('Não foi possível carregar os prestadores.'); }
    finally { if (atual === requisicao.current) setCarregando(false); }
  }, [params, inicio]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function exportar() {
    if (exportando) return;
    setExportando(true); setFeedback(null);
    try {
      await solicitarExportacaoAdmin('prestadores', params);
      setFeedback({ kind: 'success' });
    } catch (error) { setFeedback({ kind: 'error', message: mensagemErroExportacaoAdmin(error) }); }
    finally { setExportando(false); }
  }

  return <><AdminPage title={pending ? 'Prestadores pendentes' : 'Prestadores'} back={() => navigation.goBack()}
    search={busca} onSearch={setBusca} searchPlaceholder="Estabelecimento ou responsável" wide>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {pending ? (['Todos', 'Últimos 7 dias', 'Este mês'] as const).map(option =>
        <AdminChip key={option} label={option} active={periodo === option} onPress={() => { setPeriodo(option); setInicio(0); }} />) :
        statusOptions.map(option => <AdminChip key={option.value} label={option.label} active={filtro === option.value}
          onPress={() => { setFiltro(option.value); setInicio(0); }} />)}
    </ScrollView>
    <View style={styles.summary}>
      <Text style={styles.count}>{pagina?.total ?? '—'} <Text style={adminV4.muted}>resultados</Text></Text>
      <AdminAction label={exportando ? 'Solicitando…' : 'Exportar CSV'} compact kind="secondary" disabled={exportando || carregando} onPress={() => { void exportar(); }} />
    </View>
    {erro ? <AdminMessage danger>{erro}</AdminMessage> : null}
    <View style={[adminV4.card, styles.list]}>
      {desktop && !carregando && !!pagina?.prestadores.length ? <View style={styles.tableHead}>
        <Text style={[styles.tableLabel, { flex: 2 }]}>Estabelecimento</Text>
        <Text style={[styles.tableLabel, { flex: 2 }]}>Responsável</Text>
        <Text style={[styles.tableLabel, { flex: 1 }]}>Cadastro</Text>
        <Text style={[styles.tableLabel, { flex: 1 }]}>Status</Text>
      </View> : null}
      {carregando ? <Text style={adminV4.muted}>Carregando prestadores…</Text> :
        pagina?.prestadores.length ? pagina.prestadores.map((item, index) => <Pressable key={item.id}
          accessibilityRole="button" onPress={() => navigation.navigate('AdminProviderDetails', { prestadorId: item.id })}
          style={[styles.item, index > 0 && styles.divider]}>
          <View style={[styles.identity, desktop && { flex: 2 }]}>
            {item.foto_url ? <CatalogImage authenticated fotoUrl={item.foto_url} kind="provider" style={styles.avatar} /> :
              <View style={styles.avatar}><Text style={styles.initials}>{item.nome_estab.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()}</Text></View>}
            <Text style={styles.name} numberOfLines={1}>{item.nome_estab}</Text>
          </View>
          {desktop ? <><Text style={[adminV4.body, { flex: 2 }]} numberOfLines={1}>{item.responsavel_nome || 'Não informado'}</Text>
              <Text style={[adminV4.muted, { flex: 1 }]}>{item.criado_em ? new Date(item.criado_em).toLocaleDateString('pt-BR') : '—'}</Text></> :
            <View style={styles.itemText}>
              {item.responsavel_nome ? <Text style={adminV4.muted} numberOfLines={1}>{item.responsavel_nome}</Text> : null}
              <Text style={adminV4.muted}>{item.criado_em ? `Cadastrado em ${new Date(item.criado_em).toLocaleDateString('pt-BR')}` : 'Data não informada'}</Text>
            </View>}
          <View style={desktop ? { flex: 1, alignItems: 'flex-start' } : undefined}>
            {pending && !desktop ? <Ionicons name="chevron-forward" size={20} color={A.textMuted} /> :
              <Text style={[styles.status, item.status === 'ativo' && styles.activeStatus,
                item.status === 'pendente' && styles.pendingStatus]}>{item.status === 'ativo' ? 'Aprovado' : item.status}</Text>}
          </View>
        </Pressable>) : <Text style={adminV4.muted}>Nenhum prestador encontrado.</Text>}
    </View>
    <View style={styles.pager}>
      <AdminAction label="‹" accessibilityLabel="Anterior" compact kind="secondary" disabled={inicio === 0 || carregando} onPress={() => setInicio(Math.max(0, inicio - 20))} />
      <Text style={styles.pageLabel}>Página {Math.floor(inicio / 20) + 1}{pagina ? ` de ${Math.max(1, Math.ceil(pagina.total / 20))}` : ''}</Text>
      <AdminAction label="›" accessibilityLabel="Próxima" compact disabled={!pagina?.temProxima || carregando} onPress={() => setInicio(inicio + 20)} />
    </View>
  </AdminPage>
    <AdminExportFeedback feedback={feedback} onClose={() => setFeedback(null)} />
  </>;
}

const styles = StyleSheet.create({
  chips: { gap: 10, paddingVertical: 2 }, summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  count: { color: A.text, fontFamily: A.fontDisplay, fontSize: 22 }, list: { paddingVertical: 2 },
  tableHead: { flexDirection: 'row', backgroundColor: A.field, marginHorizontal: -16, marginTop: -2,
    paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tableLabel: { color: A.textMuted, fontFamily: A.fontBodySemi, fontSize: 13, textTransform: 'uppercase' },
  item: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  divider: { borderTopWidth: 1, borderTopColor: A.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: A.lilac, alignItems: 'center', justifyContent: 'center' },
  initials: { color: A.primary, fontFamily: A.fontBodyBold, fontSize: 14 },
  itemText: { flex: 1, minWidth: 0, gap: 2 }, name: { color: A.text, fontFamily: A.fontBodyBold, fontSize: 16 },
  status: { backgroundColor: '#FDE7EA', color: A.danger, borderRadius: 13, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6,
    fontFamily: A.fontBodySemi, fontSize: 13, textTransform: 'capitalize' },
  activeStatus: { backgroundColor: '#DDF5EA', color: A.success }, pendingStatus: { backgroundColor: '#FFF0D6', color: '#9A5200' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  pageLabel: { color: A.text, fontFamily: A.fontBodySemi, fontSize: 15 },
});
