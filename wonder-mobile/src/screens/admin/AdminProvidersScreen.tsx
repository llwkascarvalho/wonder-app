import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { A, AdminAction, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { AdminProvidersStackParamList } from '../../navigation/AdminProvidersStack';
import { listarPrestadoresPendentes } from '../../services/admin';
import { AdminPrestador } from '../../types/admin';

type Nav = NativeStackNavigationProp<AdminProvidersStackParamList, 'AdminProvidersList'>;

export function AdminProvidersScreen() {
  const navigation = useNavigation<Nav>();
  const [prestadores, setPrestadores] = useState<AdminPrestador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const carregar = useCallback(async () => {
    setErro('');
    try { setPrestadores(await listarPrestadoresPendentes()); }
    catch { setErro('Não foi possível carregar as solicitações.'); }
    finally { setCarregando(false); }
  }, []);
  useFocusEffect(useCallback(() => { setCarregando(true); void carregar(); }, [carregar]));

  return <AdminPage title="Solicitações pendentes" subtitle={carregando ? 'Carregando solicitações…' :
    `${prestadores.length} ${prestadores.length === 1 ? 'cadastro aguardando' : 'cadastros aguardando'} análise.`} wide>
    {erro ? <AdminMessage danger>{erro}</AdminMessage> : null}
    {carregando ? <Text style={adminV4.muted}>Carregando…</Text> : prestadores.length ? prestadores.map(item =>
      <View key={item.id} style={[adminV4.card, styles.card]}>
        <View style={styles.identity}>
          <CatalogImage authenticated fotoUrl={item.foto_url || item.solicitante_foto_url} kind="provider" style={styles.image} />
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>{item.nome_estab}</Text>
            {item.enviado_em ? <Text style={adminV4.muted}>Enviado em {new Date(item.enviado_em).toLocaleDateString('pt-BR')}</Text> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <View style={styles.action}><AdminAction label="Visualizar" kind="secondary" compact onPress={() => navigation.navigate('AdminProviderDetails', { prestadorId: item.id })} /></View>
          <View style={styles.action}><AdminAction label="Recusar" kind="danger" compact onPress={() => navigation.navigate('AdminProviderDetails', { prestadorId: item.id, initialAction: 'rejeitado' })} /></View>
        </View>
      </View>) : <View style={adminV4.card}><Text style={adminV4.body}>Nenhuma solicitação pendente.</Text></View>}
  </AdminPage>;
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 14 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 56, height: 56, borderRadius: 16 }, identityText: { flex: 1, gap: 3 },
  name: { fontFamily: A.fontDisplay, fontSize: 19, color: A.text },
  actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1 },
});
