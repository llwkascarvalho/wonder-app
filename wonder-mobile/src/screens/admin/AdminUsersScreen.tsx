import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { useAuth } from '../../contexts/AuthContext';
import {
  atualizarStatusUsuarioAdmin, atualizarUsuarioAdmin, listarUsuariosAdmin, obterUsuarioAdmin,
} from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminUsuario, AdminUsuariosPagina } from '../../types/admin';

function mensagemErro(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 409) return 'Este e-mail já está em uso ou a alteração não é permitida.';
  if (status === 400) return 'Confira o nome e o e-mail informados.';
  if (status === 404) return 'Usuário não encontrado. Atualize a lista.';
  if (status === 403) return 'Apenas administradores podem gerenciar usuários.';
  if (status === 503) return 'Não foi possível concluir a operação agora. Atualize os dados do usuário antes de tentar novamente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function AdminUsersScreen() {
  const navigation = useNavigation();
  const { usuario } = useAuth();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [inicio, setInicio] = useState(0);
  const [pagina, setPagina] = useState<AdminUsuariosPagina | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [selecionado, setSelecionado] = useState<AdminUsuario | null>(null);
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [confirmandoStatus, setConfirmandoStatus] = useState(false);
  const requisicao = useRef(0);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; requisicao.current += 1; };
  }, []);

  const carregar = useCallback(async () => {
    const atual = ++requisicao.current;
    setCarregando(true);
    setErro('');
    setPagina(null);
    try {
      const dados = await listarUsuariosAdmin(filtro, inicio);
      if (atual === requisicao.current) setPagina(dados);
    } catch (error) {
      if (atual === requisicao.current) setErro(mensagemErro(error));
    } finally {
      if (atual === requisicao.current) setCarregando(false);
    }
  }, [filtro, inicio]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function abrir(id: string) {
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      const dados = await obterUsuarioAdmin(id);
      if (!montado.current) return;
      setSelecionado(dados);
      setNome(dados.nome || '');
      setSobrenome(dados.sobrenome || '');
      setEmail(dados.email || '');
      setConfirmandoStatus(false);
    } catch (error) {
      if (montado.current) setErro(mensagemErro(error));
    } finally {
      if (montado.current) setOcupado(false);
    }
  }

  async function salvar(status = false) {
    if (!selecionado || ocupado) return;
    if (!status && (!nome.trim() || !email.trim())) {
      setErro('Informe o nome e o e-mail.');
      return;
    }
    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      const atualizado = status
        ? await atualizarStatusUsuarioAdmin(selecionado.id, !selecionado.ativo)
        : await atualizarUsuarioAdmin(selecionado.id, {
            nome: nome.trim(), sobrenome: sobrenome.trim(), email: email.trim(),
          });
      if (!montado.current) return;
      setSelecionado(atualizado);
      setNome(atualizado.nome || '');
      setSobrenome(atualizado.sobrenome || '');
      setEmail(atualizado.email || '');
      setPagina((anterior) => anterior ? {
        ...anterior, usuarios: anterior.usuarios.map((item) => item.id === atualizado.id ? atualizado : item),
      } : anterior);
      setConfirmandoStatus(false);
      setAviso(status ? (atualizado.ativo ? 'Conta reativada. O usuário pode entrar novamente.'
        : 'Conta desativada e sessões encerradas.') : 'Dados atualizados.');
    } catch (error) {
      if (montado.current) setErro(mensagemErro(error));
    } finally {
      if (montado.current) setOcupado(false);
    }
  }

  function fechar() {
    if (ocupado) return;
    setSelecionado(null);
    setConfirmandoStatus(false);
    setErro('');
    setAviso('');
    void carregar();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="Voltar" variant="outline" onPress={() => navigation.goBack()} disabled={ocupado} />
      <Text style={styles.title}>Usuários</Text>
      <Text style={styles.text}>Gerencie as contas do Wonder. Novas contas são criadas pela opção de cadastro na tela de login.</Text>
      <Input label="Buscar por nome, usuário ou e-mail" accessibilityLabel="Buscar usuários" value={busca}
        onChangeText={setBusca} maxLength={255} editable={!ocupado} />
      <Button title="Buscar" disabled={ocupado || carregando} onPress={() => {
        if (inicio === 0 && filtro === busca.trim()) void carregar();
        else { setInicio(0); setFiltro(busca.trim()); }
      }} />
      {!selecionado && erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
      {carregando ? <Text style={styles.text}>Carregando usuários...</Text> : null}
      {!carregando && pagina?.usuarios.length === 0 ? <Text style={styles.text}>Nenhum usuário encontrado.</Text> : null}
      {pagina?.usuarios.map((item) => (
        <Card key={item.id}>
          <Text style={styles.name}>{[item.nome, item.sobrenome].filter(Boolean).join(' ') || item.username}</Text>
          <Text style={styles.text}>{item.email || 'Sem e-mail'}</Text>
          <Text style={styles.text}>{item.ativo ? 'Ativo' : 'Inativo'}</Text>
          <Button title="Ver e editar" variant="outline" disabled={ocupado} onPress={() => abrir(item.id)} />
        </Card>
      ))}
      <View style={styles.actions}>
        <Button title="Anterior" variant="outline" disabled={inicio === 0 || carregando || ocupado}
          onPress={() => setInicio(Math.max(0, inicio - 20))} />
        <Button title="Próxima" variant="outline" disabled={!pagina?.temProxima || carregando || ocupado}
          onPress={() => setInicio(inicio + 20)} />
      </View>
      {!carregando && erro && !selecionado ? <Button title="Tentar novamente" onPress={carregar} /> : null}
      <Modal visible={selecionado !== null} transparent animationType="fade" onRequestClose={fechar}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modal}>
              <Text style={styles.title}>Editar usuário</Text>
              <Text style={styles.text}>Usuário: {selecionado?.username}</Text>
              <Text style={styles.text}>Status: {selecionado?.ativo ? 'Ativo' : 'Inativo'}</Text>
              <Input label="Nome" accessibilityLabel="Nome" value={nome} onChangeText={setNome} maxLength={255} editable={!ocupado} />
              <Input label="Sobrenome" accessibilityLabel="Sobrenome" value={sobrenome} onChangeText={setSobrenome} maxLength={255} editable={!ocupado} />
              <Input label="E-mail" accessibilityLabel="E-mail" value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" maxLength={254} editable={!ocupado} />
              {erro ? <Text accessibilityRole="alert" style={styles.error}>{erro}</Text> : null}
              {aviso ? <Text accessibilityRole="alert" style={styles.text}>{aviso}</Text> : null}
              <Button title="Salvar dados" loading={ocupado} onPress={() => salvar()} />
              {selecionado?.id === usuario?.keycloakId ? <Text style={styles.text}>Você não pode desativar sua própria conta.</Text> : (
                confirmandoStatus ? <View style={styles.confirmation}>
                  <Text style={styles.text}>{selecionado?.ativo
                    ? 'Desativar esta conta e encerrar suas sessões? O perfil e o histórico serão preservados.'
                    : 'Reativar esta conta? Será necessário fazer um novo login.'}</Text>
                  <Button title={selecionado?.ativo ? 'Confirmar desativação' : 'Confirmar reativação'}
                    variant={selecionado?.ativo ? 'danger' : 'primary'} disabled={ocupado} onPress={() => salvar(true)} />
                  <Button title="Voltar à edição" variant="outline" disabled={ocupado} onPress={() => setConfirmandoStatus(false)} />
                </View> : <Button title={selecionado?.ativo ? 'Desativar conta' : 'Reativar conta'}
                  variant={selecionado?.ativo ? 'danger' : 'outline'} disabled={ocupado} onPress={() => setConfirmandoStatus(true)} />
              )}
              <Button title="Fechar" variant="outline" disabled={ocupado} onPress={fechar} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.lg, paddingTop: theme.spacing.xxl, gap: theme.spacing.md, backgroundColor: theme.colors.background },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.primary },
  name: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  text: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  error: { fontSize: theme.fontSize.md, color: theme.colors.error },
  actions: { flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  modal: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg,
    width: '100%', maxWidth: 560, alignSelf: 'center', gap: theme.spacing.md },
  confirmation: { gap: theme.spacing.md },
});
