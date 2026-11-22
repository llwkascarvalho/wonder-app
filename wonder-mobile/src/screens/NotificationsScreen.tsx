import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingIndicator } from '../components/LoadingIndicator';
import { HeroGlows } from '../components/customer/HeroGlows';
import { useNotifications } from '../contexts/NotificationsContext';
import { listarNotificacoesPagina, marcarNotificacaoComoLida, marcarTodasNotificacoesComoLidas } from '../services/notificacoes';
import { customerTheme } from '../styles/customerTheme';
import { Notificacao } from '../types/notificacao';
import { formatBackendDateTime, parseBackendDate } from '../utils/dateTime';

type FiltroNotificacao = 'todas' | 'pendentes';
const LIMITE_PAGINA = 20;
const FONT_BRICO = customerTheme.v4.fontDisplay;
const FONT_FIGTREE = customerTheme.v4.fontBody;
const V4 = {
  background: customerTheme.v4.bg, primary: customerTheme.v4.primary, primaryDark: customerTheme.v4.primaryDeep,
  text: '#24102E', muted: '#675B75', iconSurface: '#EFE3FA',
  readIconSurface: '#EFEAF6', divider: '#E7E0EF', danger: '#C62828',
  dangerSurface: '#FDE3E5',
} as const;

type ItemLista = { tipo: 'grupo'; titulo: string } | { tipo: 'notificacao'; notificacao: Notificacao };

function formatarData(criadoEm: string): string {
  return formatBackendDateTime(criadoEm, criadoEm, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).replace('.', '');
}
function ordenarMaisRecentes(a: Notificacao, b: Notificacao) {
  return parseBackendDate(b.criado_em).getTime() - parseBackendDate(a.criado_em).getTime();
}
function rotuloPeriodo(criadoEm: string): string {
  const data = parseBackendDate(criadoEm);
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === hoje.toDateString()) return 'Hoje';
  if (data.toDateString() === ontem.toDateString()) return 'Ontem';
  return formatBackendDateTime(criadoEm, criadoEm, { day: '2-digit', month: 'long', year: 'numeric' });
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const desktop = viewportWidth >= 900;
  const tablet = viewportWidth >= 640;
  const { refreshUnreadCount, unreadCount } = useNotifications();
  const [filtro, setFiltro] = useState<FiltroNotificacao>('todas');
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [temProxima, setTemProxima] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (proximoFiltro: FiltroNotificacao = filtro) => {
    setErro(null);
    try {
      const resultado = await listarNotificacoesPagina(0, LIMITE_PAGINA,
        proximoFiltro === 'pendentes' ? 'pendente' : undefined);
      setNotificacoes(resultado.itens.sort(ordenarMaisRecentes));
      setPagina(0);
      setTemProxima(resultado.temProxima);
    } catch {
      setErro('Não foi possível carregar seus avisos. Tente novamente.');
    }
  }, [filtro]);

  useEffect(() => {
    setCarregando(true);
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  function trocarFiltro(proximoFiltro: FiltroNotificacao) {
    if (proximoFiltro === filtro) return;
    setFiltro(proximoFiltro);
  }
  async function handleRefresh() {
    setAtualizando(true);
    await carregar();
    await refreshUnreadCount();
    setAtualizando(false);
  }
  async function marcarComoLida(notificacao: Notificacao) {
    if (notificacao.status === 'lida') return;
    setNotificacoes((atual) => atual.map((item) => item.id === notificacao.id ? { ...item, status: 'lida' } : item));
    try {
      await marcarNotificacaoComoLida(notificacao.id);
      await refreshUnreadCount();
    } catch {
      setNotificacoes((atual) => atual.map((item) => item.id === notificacao.id ? { ...item, status: notificacao.status } : item));
    }
  }
  async function marcarTodasComoLidas() {
    if (!unreadCount || marcandoTodas) return;
    setMarcandoTodas(true);
    try {
      await marcarTodasNotificacoesComoLidas();
      setNotificacoes((atual) => atual.map((item) => ({ ...item, status: 'lida' })));
      await refreshUnreadCount();
    } catch {
      setErro('Não foi possível marcar os avisos como lidos. Tente novamente.');
    } finally {
      setMarcandoTodas(false);
    }
  }
  async function carregarMais() {
    if (!temProxima || carregandoMais) return;
    setCarregandoMais(true);
    try {
      const resultado = await listarNotificacoesPagina(pagina + 1, LIMITE_PAGINA,
        filtro === 'pendentes' ? 'pendente' : undefined);
      setNotificacoes((atual) => [...atual, ...resultado.itens].sort(ordenarMaisRecentes));
      setPagina(resultado.pagina);
      setTemProxima(resultado.temProxima);
    } catch {
      setErro('Não foi possível carregar mais avisos. Tente novamente.');
    } finally {
      setCarregandoMais(false);
    }
  }

  const itensLista = useMemo<ItemLista[]>(() => {
    const itens: ItemLista[] = [];
    let periodoAtual = '';
    notificacoes.forEach((notificacao) => {
      const periodo = rotuloPeriodo(notificacao.criado_em);
      if (periodo !== periodoAtual) {
        itens.push({ tipo: 'grupo', titulo: periodo });
        periodoAtual = periodo;
      }
      itens.push({ tipo: 'notificacao', notificacao });
    });
    return itens;
  }, [notificacoes]);

  const filtros = (
    <View style={styles.filters} accessibilityRole="tablist">
      {([['todas', 'Todas'], ['pendentes', 'Não lidas']] as const).map(([value, label]) => {
        const ativo = filtro === value;
        return <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: ativo }} onPress={() => trocarFiltro(value)}
          style={({ pressed }) => [styles.filter, ativo && styles.filterActive, pressed && styles.pressed]}>
          <Text style={[styles.filterText, ativo && styles.filterTextActive]}>{label}</Text>
        </Pressable>;
      })}
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.hero, desktop && styles.heroDesktop, { paddingTop: desktop ? 44 : Math.max(insets.top, 56) }]}>
        <HeroGlows desktop={desktop} />
        <Text style={[styles.heroTitle, desktop && styles.heroTitleDesktop]}>Notificações</Text>
        <Text style={styles.heroSubtitle}>
          {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'aviso novo' : 'avisos novos'} para você.` : 'Você está em dia com seus avisos.'}
        </Text>
      </View>
      <View style={[styles.sheetContainer, desktop && styles.sheetDesktop]}>
      <FlatList
        style={styles.list}
        data={itensLista}
        keyExtractor={(item, index) => item.tipo === 'grupo' ? `grupo-${item.titulo}` : `notificacao-${item.notificacao.id}-${index}`}
        contentContainerStyle={[styles.content, tablet && styles.contentTablet, desktop && styles.contentDesktop]}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={handleRefresh} tintColor={V4.primary} />}
        ListHeaderComponent={(
          <View style={styles.headerContent}>
            {!desktop ? filtros : null}
            {carregando ? <LoadingIndicator text="Carregando avisos..." /> : erro ? (
              <View style={styles.feedbackCard}>
                <MaterialIcons name="cloud-off" size={24} color={V4.danger} />
                <Text style={styles.feedbackTitle}>Não foi possível atualizar</Text>
                <Text style={styles.feedbackText}>{erro}</Text>
                <Pressable accessibilityRole="button" onPress={() => carregar()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                  <Text style={styles.retryButtonText}>Tentar novamente</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={carregando || erro ? null : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><MaterialIcons name="notifications-none" size={28} color={V4.primary} /></View>
            <Text style={styles.emptyTitle}>{filtro === 'pendentes' ? 'Tudo lido por aqui' : 'Nenhuma notificação ainda'}</Text>
            <Text style={styles.emptyText}>{filtro === 'pendentes' ? 'Quando houver um novo aviso, ele aparecerá nesta área.' : 'Confirmações, cancelamentos e lembretes aparecerão nesta área.'}</Text>
          </View>
        )}
        ListFooterComponent={temProxima ? <Pressable accessibilityRole="button" disabled={carregandoMais}
          onPress={carregarMais} style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}>
          <Text style={styles.loadMoreText}>{carregandoMais ? 'Carregando...' : 'Carregar mais avisos'}</Text>
        </Pressable> : null}
        renderItem={({ item, index }) => {
          if (item.tipo === 'grupo') return (
            <View style={styles.periodRow}>
              <Text style={styles.periodTitle}>{item.titulo}</Text>
              {!desktop && index === 0 && unreadCount > 0 ? <Pressable accessibilityRole="button" disabled={marcandoTodas}
                onPress={marcarTodasComoLidas} style={({ pressed }) => [styles.markAllButton, pressed && styles.pressed]}>
                <MaterialIcons name="done-all" size={19} color={V4.primary} />
                <Text style={styles.markAllButtonText}>{marcandoTodas ? 'Marcando...' : 'Marcar todas como lidas'}</Text>
              </Pressable> : null}
            </View>
          );
          const notificacao = item.notificacao;
          const naoLida = notificacao.status !== 'lida';
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={naoLida ? `Marcar aviso como lido: ${notificacao.mensagem}` : notificacao.mensagem} onPress={() => marcarComoLida(notificacao)} style={({ pressed }) => [styles.notificationCard, !naoLida && styles.notificationCardRead, pressed && styles.pressed]}>
              <View style={[styles.notificationIcon, naoLida ? styles.notificationIconUnread : styles.notificationIconRead]}>
                <MaterialIcons name={naoLida ? 'notifications-active' : 'notifications-none'} size={22} color={naoLida ? V4.primary : V4.muted} />
              </View>
              <View style={styles.notificationBody}>
                <View style={styles.notificationMeta}>
                  <View style={styles.stateLine}>
                    {naoLida ? <View style={styles.newDot} /> : null}
                    <Text style={[styles.notificationState, naoLida && styles.notificationStateUnread]}>{naoLida ? 'Novo aviso' : 'Lido'}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatarData(notificacao.criado_em)}</Text>
                </View>
                <Text style={[styles.messageText, naoLida && styles.messageTextUnread]}>{notificacao.mensagem}</Text>
                {naoLida ? <Text style={styles.actionHint}>Toque para marcar como lido</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
      {desktop ? <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Resumo</Text>
        <View style={styles.summaryCount}><Text style={styles.summaryNumber}>{unreadCount}</Text><Text style={styles.summaryCaption}>avisos novos</Text></View>
        <View style={styles.summaryDivider} />
        <Text style={styles.summaryPrompt}>Mostrar</Text>
        {filtros}
        <Pressable accessibilityRole="button" disabled={!unreadCount || marcandoTodas} onPress={marcarTodasComoLidas} style={styles.summaryButton}>
          <Text style={styles.summaryButtonText}>{marcandoTodas ? 'Marcando...' : 'Marcar todas como lidas'}</Text>
        </Pressable>
      </View> : null}
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#2E0A57', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  screen: { backgroundColor: V4.background, flex: 1 },
  hero: { backgroundColor: V4.primary, height: 176, overflow: 'hidden', paddingHorizontal: 20, width: '100%' },
  heroDesktop: { height: 216, paddingHorizontal: 76 },
  heroTitle: { color: '#FFF', fontFamily: FONT_BRICO, fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginTop: 0 },
  heroTitleDesktop: { fontSize: 56, lineHeight: 62 },
  heroSubtitle: { color: '#FFF', fontFamily: FONT_FIGTREE, fontSize: 17, marginTop: 4 },
  sheetContainer: { backgroundColor: V4.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, marginTop: -28, overflow: 'hidden', width: '100%' },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, flexDirection: 'row', gap: 32, marginTop: -40, paddingHorizontal: 76, paddingTop: 40 },
  list: { flex: 1 },
  content: { gap: 14, paddingBottom: 150, paddingHorizontal: 20, paddingTop: 24 },
  contentTablet: { paddingHorizontal: 32 },
  contentDesktop: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 72 },
  headerContent: { gap: 14 },
  filters: { flexDirection: 'row', gap: 12 },
  filter: { alignItems: 'center', backgroundColor: '#FFF', borderColor: V4.divider, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', minWidth: 76, paddingHorizontal: 20 },
  filterActive: { backgroundColor: V4.primary, borderColor: V4.primary },
  filterText: { color: V4.text, fontFamily: FONT_FIGTREE, fontSize: 15, fontWeight: '600' },
  filterTextActive: { color: '#FFF' },
  periodRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, width: '100%' },
  markAllButton: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingVertical: 2 },
  markAllButtonText: { color: V4.primary, fontFamily: FONT_FIGTREE, fontSize: 14, fontWeight: '600' },
  periodTitle: { color: V4.text, fontFamily: FONT_BRICO, fontSize: 20, fontWeight: '800' },
  notificationCard: { alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', gap: 12, padding: 14, ...cardShadow },
  notificationCardRead: { borderColor: V4.divider, borderWidth: 1, shadowOpacity: 0 },
  notificationIcon: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  notificationIconUnread: { backgroundColor: V4.iconSurface },
  notificationIconRead: { backgroundColor: V4.readIconSurface },
  notificationBody: { flex: 1, gap: 6, minWidth: 0 },
  notificationMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stateLine: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  newDot: { backgroundColor: V4.primary, borderRadius: 4, height: 8, width: 8 },
  notificationState: { color: V4.muted, fontFamily: FONT_FIGTREE, fontSize: 14, fontWeight: '700' },
  notificationStateUnread: { color: V4.primary },
  dateText: { color: V4.muted, fontFamily: FONT_FIGTREE, fontSize: 13 },
  messageText: { color: V4.muted, fontFamily: FONT_FIGTREE, fontSize: 16, lineHeight: 22 },
  messageTextUnread: { color: V4.text, fontWeight: '600' },
  actionHint: { color: V4.primary, fontFamily: FONT_FIGTREE, fontSize: 14, fontWeight: '600' },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, gap: 8, marginTop: 4, padding: 24, ...cardShadow },
  emptyIcon: { alignItems: 'center', backgroundColor: V4.iconSurface, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  emptyTitle: { color: V4.text, fontFamily: FONT_BRICO, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: V4.muted, fontFamily: FONT_FIGTREE, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  feedbackCard: { alignItems: 'center', backgroundColor: V4.dangerSurface, borderRadius: 20, gap: 7, padding: 20 },
  feedbackTitle: { color: V4.danger, fontFamily: FONT_FIGTREE, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  feedbackText: { color: V4.danger, fontFamily: FONT_FIGTREE, fontSize: 14, textAlign: 'center' },
  retryButton: { backgroundColor: V4.danger, borderRadius: 999, marginTop: 6, paddingHorizontal: 18, paddingVertical: 10 },
  retryButtonText: { color: '#FFF', fontFamily: FONT_FIGTREE, fontSize: 14, fontWeight: '700' },
  loadMoreButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FFF', borderRadius: 999, marginTop: 4, paddingHorizontal: 18, paddingVertical: 11, ...cardShadow },
  loadMoreText: { color: V4.primaryDark, fontFamily: FONT_FIGTREE, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.82 },
  summary: { width: 320, alignSelf: 'flex-start', backgroundColor: '#FFF', borderRadius: 24, padding: 24, gap: 18, ...cardShadow },
  summaryTitle: { fontFamily: FONT_BRICO, fontSize: 20, color: V4.text },
  summaryCount: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  summaryNumber: { fontFamily: FONT_BRICO, color: V4.primary, fontSize: 56, lineHeight: 56 },
  summaryCaption: { fontFamily: FONT_FIGTREE, color: V4.muted, fontSize: 16, paddingBottom: 4 },
  summaryDivider: { backgroundColor: V4.divider, height: 1 },
  summaryPrompt: { fontFamily: FONT_FIGTREE, color: V4.text, fontSize: 15, fontWeight: '600' },
  summaryButton: { backgroundColor: V4.iconSurface, borderRadius: 28, height: 52, alignItems: 'center', justifyContent: 'center' },
  summaryButtonText: { fontFamily: FONT_FIGTREE, color: V4.primary, fontSize: 17, fontWeight: '600' },
});
