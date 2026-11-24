import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { A, AdminAction, AdminChip, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { AdminExportFeedback, AdminExportFeedbackState } from '../../components/admin/AdminExportFeedback';
import { useAuth } from '../../contexts/AuthContext';
import { atualizarStatusUsuarioAdmin, atualizarUsuarioAdmin, listarUsuariosAdmin, mensagemErroExportacaoAdmin, obterUsuarioAdmin, solicitarExportacaoAdmin } from '../../services/admin';
import { AdminUsuario, AdminUsuariosPagina } from '../../types/admin';

const roles = [
  { label: 'Todos', value: '' }, { label: 'Clientes', value: 'CUSTOMER' },
  { label: 'Prestadores', value: 'PROVIDER' }, { label: 'Admin', value: 'ADMIN' },
];

export function AdminUsersScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { usuario } = useAuth();
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [papel, setPapel] = useState('');
  const [inicio, setInicio] = useState(0);
  const [pagina, setPagina] = useState<AdminUsuariosPagina | null>(null);
  const [selecionado, setSelecionado] = useState<AdminUsuario | null>(null);
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [feedback, setFeedback] = useState<AdminExportFeedbackState>(null);
  const requisicao = useRef(0);

  useEffect(() => { const timer = setTimeout(() => { setInicio(0); setBuscaAplicada(busca.trim()); }, 350); return () => clearTimeout(timer); }, [busca]);
  const carregar = useCallback(async () => {
    const atual = ++requisicao.current;
    setCarregando(true); setErro('');
    try { const dados = await listarUsuariosAdmin(buscaAplicada, inicio, papel || undefined); if (atual === requisicao.current) setPagina(dados); }
    catch { if (atual === requisicao.current) setErro('Não foi possível carregar os usuários.'); }
    finally { if (atual === requisicao.current) setCarregando(false); }
  }, [buscaAplicada, inicio, papel]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function abrir(id: string) {
    setOcupado(true); setErro(''); setAviso('');
    try {
      const dados = await obterUsuarioAdmin(id);
      setSelecionado(dados); setNome(dados.nome || ''); setSobrenome(dados.sobrenome || ''); setEmail(dados.email || '');
      setConfirmando(false);
    } catch { setErro('Não foi possível abrir este usuário.'); }
    finally { setOcupado(false); }
  }

  async function salvar(status = false) {
    if (!selecionado || ocupado) return;
    if (!status && (!nome.trim() || !email.trim())) { setErro('Informe nome e e-mail.'); return; }
    setOcupado(true); setErro(''); setAviso('');
    try {
      const atualizado = status ? await atualizarStatusUsuarioAdmin(selecionado.id, !selecionado.ativo) :
        await atualizarUsuarioAdmin(selecionado.id, { nome: nome.trim(), sobrenome: sobrenome.trim(), email: email.trim() });
      setSelecionado(atualizado); setConfirmando(false);
      setPagina(anterior => anterior ? { ...anterior, usuarios: anterior.usuarios.map(item => item.id === atualizado.id ? atualizado : item) } : anterior);
      setAviso(status ? (atualizado.ativo ? 'Conta reativada.' : 'Conta desativada e sessões encerradas.') : 'Dados atualizados.');
    } catch (error) {
      const code = (error as { response?: { status?: number } })?.response?.status;
      setErro(code === 409 ? 'Este e-mail já está em uso ou a alteração não é permitida.' :
        code === 503 ? 'Não foi possível concluir a operação agora. Atualize os dados do usuário antes de tentar novamente.' :
        'Não foi possível salvar. Tente novamente.');
    } finally { setOcupado(false); }
  }

  async function exportar() {
    if (exportando) return;
    setExportando(true); setFeedback(null);
    try {
      await solicitarExportacaoAdmin('usuarios', { busca: buscaAplicada, papel: papel || undefined });
      setFeedback({ kind: 'success' });
    } catch (error) { setFeedback({ kind: 'error', message: mensagemErroExportacaoAdmin(error) }); }
    finally { setExportando(false); }
  }

  return <><AdminPage title="Usuários" back={() => navigation.goBack()} search={busca} onSearch={setBusca} wide>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {roles.map(option => <AdminChip key={option.value} label={option.label} active={papel === option.value}
        onPress={() => { setPapel(option.value); setInicio(0); }} />)}
    </ScrollView>
    <View style={styles.summary}><Text style={styles.count}>{pagina?.total ?? '—'} <Text style={adminV4.muted}>resultados</Text></Text>
      <AdminAction label={exportando ? 'Solicitando…' : 'Exportar CSV'} compact kind="secondary" disabled={carregando || exportando} onPress={() => { void exportar(); }} /></View>
    {erro && !selecionado ? <AdminMessage danger>{erro}</AdminMessage> : null}
    {aviso && !selecionado ? <AdminMessage>{aviso}</AdminMessage> : null}
    <View style={[adminV4.card, styles.list]}>
      {desktop && !carregando && !!pagina?.usuarios.length ? <View style={styles.tableHead}>
        <Text style={[styles.tableLabel, { flex: 2 }]}>Usuário</Text><Text style={[styles.tableLabel, { flex: 2 }]}>E-mail</Text>
        <Text style={[styles.tableLabel, { flex: 1 }]}>Status</Text>
      </View> : null}
      {carregando ? <Text style={adminV4.muted}>Carregando usuários…</Text> :
        pagina?.usuarios.length ? pagina.usuarios.map((item, index) => <Pressable key={item.id} accessibilityRole="button"
          accessibilityLabel={`Ver e editar ${[item.nome, item.sobrenome].filter(Boolean).join(' ') || item.username}`}
          onPress={() => { void abrir(item.id); }} style={[styles.item, index > 0 && styles.divider]}>
          <View style={[styles.identity, desktop && { flex: 2 }]}>
            <View style={styles.avatar}><Text style={styles.initials}>{[item.nome?.[0], item.sobrenome?.[0]].filter(Boolean).join('').toUpperCase() || item.username.slice(0, 2).toUpperCase()}</Text></View>
            <View style={styles.itemText}><Text style={styles.name} numberOfLines={1}>{[item.nome, item.sobrenome].filter(Boolean).join(' ') || item.username}</Text>
              {!desktop ? <Text style={adminV4.muted} numberOfLines={1}>{item.email || 'Sem e-mail'}</Text> : null}</View>
          </View>
          {desktop ? <Text style={[adminV4.body, { flex: 2 }]} numberOfLines={1}>{item.email || 'Sem e-mail'}</Text> : null}
          <View style={desktop ? { flex: 1, alignItems: 'flex-start' } : undefined}>
            <Text style={[styles.status, item.ativo && styles.activeStatus]}>{item.ativo ? 'Ativo' : 'Inativo'}</Text>
          </View>
        </Pressable>) : <Text style={adminV4.muted}>Nenhum usuário encontrado.</Text>}
    </View>
    <View style={styles.pager}>
      <AdminAction label="‹" accessibilityLabel="Anterior" compact kind="secondary" disabled={inicio === 0 || carregando} onPress={() => setInicio(Math.max(0, inicio - 20))} />
      <Text style={styles.pageLabel}>Página {Math.floor(inicio / 20) + 1}{pagina ? ` de ${Math.max(1, Math.ceil(pagina.total / 20))}` : ''}</Text>
      <AdminAction label="›" accessibilityLabel="Próxima" compact disabled={!pagina?.temProxima || carregando} onPress={() => setInicio(inicio + 20)} />
    </View>
    <Modal visible={!!selecionado} transparent animationType="slide" onRequestClose={() => setSelecionado(null)}>
      <View style={styles.overlay}><ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.modal}>
          <View style={styles.handle} /><Text style={adminV4.heading}>Editar usuário</Text>
          <Text style={adminV4.muted}>{selecionado?.username} · {selecionado?.ativo ? 'Ativo' : 'Inativo'}</Text>
          <Field label="Nome" value={nome} onChange={setNome} />
          <Field label="Sobrenome" value={sobrenome} onChange={setSobrenome} />
          <Field label="E-mail" value={email} onChange={setEmail} email />
          {erro ? <AdminMessage danger>{erro}</AdminMessage> : null}{aviso ? <AdminMessage>{aviso}</AdminMessage> : null}
          <AdminAction label={ocupado ? 'Salvando…' : 'Salvar dados'} disabled={ocupado} onPress={() => { void salvar(); }} />
          {selecionado?.id === usuario?.keycloakId ? <Text style={adminV4.muted}>Você não pode desativar sua própria conta.</Text> :
            confirmando ? <View style={styles.confirmation}>
              <Text style={adminV4.body}>{selecionado?.ativo ? 'Desativar esta conta e encerrar suas sessões?' : 'Reativar esta conta?'}</Text>
              <AdminAction label={selecionado?.ativo ? 'Confirmar desativação' : 'Confirmar reativação'}
                kind={selecionado?.ativo ? 'danger' : 'primary'} disabled={ocupado} onPress={() => { void salvar(true); }} />
              <AdminAction label="Voltar" kind="secondary" onPress={() => setConfirmando(false)} />
            </View> : <AdminAction label={selecionado?.ativo ? 'Desativar conta' : 'Reativar conta'}
              kind={selecionado?.ativo ? 'danger' : 'secondary'} onPress={() => setConfirmando(true)} />}
          <AdminAction label="Fechar" kind="secondary" disabled={ocupado} onPress={() => { setSelecionado(null); setErro(''); setAviso(''); void carregar(); }} />
        </View>
      </ScrollView></View>
    </Modal>
  </AdminPage>
    <AdminExportFeedback feedback={feedback} onClose={() => setFeedback(null)} />
  </>;
}

function Field({ label, value, onChange, email }: { label: string; value: string; onChange: (value: string) => void; email?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={styles.input}
      keyboardType={email ? 'email-address' : 'default'} autoCapitalize={email ? 'none' : 'sentences'} /></View>;
}

const styles = StyleSheet.create({
  chips: { gap: 10, paddingVertical: 2 }, summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  count: { color: A.text, fontFamily: A.fontDisplay, fontSize: 22 }, list: { paddingVertical: 2 },
  tableHead: { flexDirection: 'row', backgroundColor: A.field, marginHorizontal: -16, marginTop: -2,
    paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tableLabel: { color: A.textMuted, fontFamily: A.fontBodySemi, fontSize: 13, textTransform: 'uppercase' },
  item: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  divider: { borderTopWidth: 1, borderTopColor: A.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: A.lilac, alignItems: 'center', justifyContent: 'center' },
  initials: { color: A.primary, fontFamily: A.fontBodyBold, fontSize: 14 },
  itemText: { flex: 1, minWidth: 0, gap: 2 }, name: { color: A.text, fontFamily: A.fontBodyBold, fontSize: 16 },
  status: { overflow: 'hidden', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FDE7EA', color: A.danger,
    fontFamily: A.fontBodySemi, fontSize: 13 }, activeStatus: { backgroundColor: '#DDF5EA', color: A.success },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  pageLabel: { color: A.text, fontFamily: A.fontBodySemi, fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#2E0A579E' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modal: { width: '100%', maxWidth: 520, alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    backgroundColor: '#fff', padding: 20, paddingBottom: 32, gap: 16 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: A.border, alignSelf: 'center' },
  field: { gap: 8 }, fieldLabel: { color: A.text, fontFamily: A.fontBodySemi, fontSize: 15 },
  input: { height: 56, borderRadius: 16, backgroundColor: A.field, paddingHorizontal: 16, color: A.text, fontFamily: A.fontBody, fontSize: 16 },
  confirmation: { gap: 12 },
});
