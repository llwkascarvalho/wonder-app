import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { A, AdminAction, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { ProfileAvatar } from '../../components/profile/ProfileAvatar';
import { ProfileEditModal } from '../../components/profile/ProfileEditModal';
import { useAuth } from '../../contexts/AuthContext';
import { AdminHomeStackParamList, AdminTabsParamList } from '../../navigation/AdminTabs';
import { obterAgendamentosAdmin, obterIndicadoresAdmin } from '../../services/admin';
import { AdminDashboardIndicadores } from '../../types/admin';
import { UserProfileUpdate } from '../../types/profile';

type Nav = CompositeNavigationProp<NativeStackNavigationProp<AdminHomeStackParamList, 'AdminHomeHub'>,
  BottomTabNavigationProp<AdminTabsParamList>>;

export function AdminHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { usuario, signOut, updateProfile } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gridWidth = Math.min(width - (width >= 900 ? (width >= 1280 ? 272 : 248) : 0) - 40, 1040);
  const [indicadores, setIndicadores] = useState<AdminDashboardIndicadores | null>(null);
  const [agendamentosMes, setAgendamentosMes] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [editarPerfil, setEditarPerfil] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [fotoRevisao, setFotoRevisao] = useState(0);

  async function salvarPerfil(payload: UserProfileUpdate) {
    setSalvandoPerfil(true);
    try {
      await updateProfile(payload);
      if (payload.foto) setFotoRevisao(value => value + 1);
      setEditarPerfil(false);
    } finally { setSalvandoPerfil(false); }
  }

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const dados = await obterIndicadoresAdmin();
      setIndicadores(dados);
      const [ano, mes] = dados.mes_referencia.split('-').map(Number);
      const inicio = `${dados.mes_referencia}-01`;
      const fim = `${dados.mes_referencia}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`;
      const relatorio = await obterAgendamentosAdmin(inicio, fim);
      setAgendamentosMes(relatorio.total_agendamentos);
    } catch {
      setErro('Não foi possível carregar os indicadores. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setCarregando(true); void carregar(); }, [carregar]));

  const cards = [
    { label: 'Usuários', value: indicadores?.total_usuarios, description: 'Contas cadastradas', icon: 'people-outline' as const,
      onPress: () => navigation.navigate('AdminUsers') },
    { label: 'Prestadores', value: indicadores?.total_prestadores, description: 'Todos os cadastros', icon: 'storefront-outline' as const,
      onPress: () => navigation.navigate('AdminProvidersDirectory', { pending: false }) },
    { label: 'Prestadores pendentes', value: indicadores?.prestadores_pendentes, description: 'Aguardando análise', icon: 'time-outline' as const,
      onPress: () => navigation.navigate('AdminProvidersDirectory', { pending: true }) },
    { label: 'Agendamentos no mês', value: agendamentosMes, description: 'Todos os status', icon: 'calendar-outline' as const,
      onPress: () => navigation.navigate('AdminReport') },
  ];

  return <>
  <AdminPage title="Visão geral" subtitle="Acompanhe os dados do Wonder."
    accountName={usuario?.primeiroNome || usuario?.nome || 'Admin'} accountPhotoUrl={usuario?.foto_url}
    accountPhotoRevision={fotoRevisao} onAccountPress={() => setMenuAberto(true)} wide>
    {erro ? <AdminMessage danger>{erro}</AdminMessage> : null}
    <View style={styles.grid}>
      {cards.map((card, index) => <Pressable key={card.label} onPress={card.onPress} accessibilityRole="button"
        accessibilityLabel={`${card.label}: ${card.value ?? 'carregando'}`}
        style={[adminV4.card, styles.stat, { width: width >= 900 ? (gridWidth - 36) / 4 : (gridWidth - 12) / 2 },
          index === 2 && styles.statPrimary, index === 3 && styles.statViolet]}>
        <View style={[styles.icon, index >= 2 && styles.iconOnColor]}><Ionicons name={card.icon} size={22} color={index === 3 ? A.violet : A.primary} /></View>
        <Text style={[styles.value, index >= 2 && styles.white]}>{card.value == null ? (carregando ? '…' : '—') : card.value.toLocaleString('pt-BR')}</Text>
        <Text style={[styles.label, index >= 2 && styles.white]}>{card.label}</Text>
        <Text style={[styles.description, index >= 2 && styles.whiteMuted]}>{card.description}</Text>
      </Pressable>)}
    </View>
    {erro ? <AdminAction label="Tentar novamente" onPress={() => { setCarregando(true); void carregar(); }} /> : null}
  </AdminPage>
  <Modal transparent visible={menuAberto} animationType="fade" onRequestClose={() => setMenuAberto(false)}>
    <View style={styles.menuBackdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Fechar opções da conta" onPress={() => setMenuAberto(false)} />
      <View style={[styles.menuSheet, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <View style={styles.handle} />
        <Text style={styles.menuTitle}>Sua conta</Text>
        <View style={styles.menuIdentity}>
          <ProfileAvatar nome={usuario?.nome || 'Admin'} fotoUrl={usuario?.foto_url} revision={fotoRevisao} size={56} />
          <View style={styles.menuIdentityText}>
            <Text style={styles.menuName} numberOfLines={1}>{usuario?.nome || 'Admin'}</Text>
            <Text style={styles.menuEmail} numberOfLines={1}>{usuario?.email || 'Administrador Wonder'}</Text>
          </View>
        </View>
        <AdminAction label="Editar nome e foto" onPress={() => { setMenuAberto(false); setEditarPerfil(true); }} />
        <AdminAction label="Sair da conta" kind="danger" onPress={() => { setMenuAberto(false); void signOut(); }} />
      </View>
    </View>
  </Modal>
  {usuario ? <ProfileEditModal appearance="customer" visible={editarPerfil} profile={usuario} loading={salvandoPerfil}
    onClose={() => setEditarPerfil(false)} onSave={salvarPerfil} /> : null}
  </>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { minHeight: 184, gap: 4, padding: 16 },
  statPrimary: { backgroundColor: A.primary }, statViolet: { backgroundColor: A.violet },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: A.lilac, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  iconOnColor: { backgroundColor: '#fff' },
  value: { fontFamily: A.fontDisplay, fontSize: 34, lineHeight: 38, color: A.text },
  label: { fontFamily: A.fontBodyBold, fontSize: 15, lineHeight: 20, color: A.text },
  description: { fontFamily: A.fontBody, fontSize: 14, color: A.textMuted },
  white: { color: '#fff' }, whiteMuted: { color: '#FFFFFFD9' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(46,10,87,0.62)', justifyContent: 'flex-end' },
  menuSheet: { alignSelf: 'center', width: '100%', maxWidth: 560, backgroundColor: A.surface, borderTopLeftRadius: 28,
    borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: A.border, marginBottom: 6 },
  menuTitle: { color: A.text, fontFamily: A.fontDisplay, fontSize: 26 },
  menuIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: A.field, borderRadius: 20, padding: 12 },
  menuIdentityText: { flex: 1, minWidth: 0, gap: 3 },
  menuName: { color: A.text, fontFamily: A.fontBodyBold, fontSize: 17 },
  menuEmail: { color: A.textMuted, fontFamily: A.fontBody, fontSize: 14 },
});
