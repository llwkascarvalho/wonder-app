import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { A, AdminAction, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { Input } from '../../components/Input';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { AdminProvidersStackParamList } from '../../navigation/AdminProvidersStack';
import { atualizarStatusPrestadorAdmin, obterPrestadorAdmin, obterUsuarioAdmin } from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminPrestadorDetalhe, AdminPrestadorStatus, AdminUsuario } from '../../types/admin';
import {
  AdminProviderStatusAction,
  getAdminProviderStatusActions,
  getAdminProviderStatusSuccessMessage,
} from '../../utils/adminProviderStatus';
import { formatBackendDateTime } from '../../utils/dateTime';

type Route = RouteProp<AdminProvidersStackParamList, 'AdminProviderDetails'>;
type Navigation = NativeStackNavigationProp<AdminProvidersStackParamList, 'AdminProviderDetails'>;
type NoteAction = 'rejeitado' | 'rascunho';

const dayLabels = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

function formatDate(value?: string | null): string {
  return formatBackendDateTime(value, '-');
}

function formatAddress(prestador: AdminPrestadorDetalhe): string {
  const street = [prestador.endereco, prestador.numero].filter(Boolean).join(', ');
  const city = [prestador.cidade, prestador.estado].filter(Boolean).join(' - ');
  return [street, prestador.complemento, prestador.bairro, city].filter(Boolean).join('\n') || 'Não informado';
}

function extractBackendMessage(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;

  function parseDetail(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(parseDetail).filter(Boolean).join('\n') || null;
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return (
        parseDetail(objectValue.detail) ||
        parseDetail(objectValue.message) ||
        parseDetail(objectValue.erros) ||
        null
      );
    }

    return null;
  }

  return parseDetail(responseData) || fallback;
}

export function AdminProviderDetailsScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const { width } = useWindowDimensions();
  const [prestador, setPrestador] = useState<AdminPrestadorDetalhe | null>(null);
  const [responsavel, setResponsavel] = useState<AdminUsuario | null>(null);
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStatus, setSavingStatus] = useState<AdminPrestadorStatus | null>(null);
  const [error, setError] = useState('');
  const [noteModalAction, setNoteModalAction] = useState<NoteAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<AdminProviderStatusAction | null>(null);
  const [note, setNote] = useState('');

  const horariosResumo = useMemo(() => {
    if (!prestador?.horarios.length) {
      return 'Nenhum horario cadastrado.';
    }

    return prestador.horarios
      .map((horario) => {
        const dia = dayLabels[horario.dia_semana] || 'Dia';
        return `${dia}: ${horario.hora_inicio.slice(0, 5)} - ${horario.hora_fim.slice(0, 5)}`;
      })
      .join('\n');
  }, [prestador]);

  const statusActions = useMemo(
    () => (prestador ? getAdminProviderStatusActions(prestador.status) : []),
    [prestador]
  );

  const load = useCallback(async () => {
    setError('');
    try {
      const dados = await obterPrestadorAdmin(route.params.prestadorId);
      setPrestador(dados);
      try { setResponsavel(await obterUsuarioAdmin(String(dados.usuario_id))); }
      catch { setResponsavel(null); }
    } catch {
      setError('Nao foi possivel carregar o detalhe do prestador.');
    }
  }, [route.params.prestadorId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (route.params.initialAction === 'rejeitado') setNoteModalAction('rejeitado');
  }, [route.params.initialAction]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function updateStatus(status: AdminPrestadorStatus, motivo?: string) {
    if (!prestador) {
      return;
    }

    const previousStatus = prestador.status;
    setSavingStatus(status);
    setError('');

    try {
      await atualizarStatusPrestadorAdmin(route.params.prestadorId, {
        status,
        motivo_rejeicao: motivo,
      });
      setNoteModalAction(null);
      setNote('');
      await load();
      setSucesso(getAdminProviderStatusSuccessMessage(previousStatus, status));
    } catch (statusError) {
      setError(extractBackendMessage(statusError, 'Nao foi possivel atualizar o status do prestador.'));
    } finally {
      setSavingStatus(null);
    }
  }

  function openNoteModal(action: NoteAction) {
    setNote('');
    setNoteModalAction(action);
  }

  function requestStatusUpdate(action: AdminProviderStatusAction) {
    if (action.requiresNote) {
      openNoteModal(action.status as NoteAction);
      return;
    }

    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }

    updateStatus(action.status);
  }

  function confirmNoteAction() {
    if (!noteModalAction || !note.trim()) {
      setError('Informe o motivo ou observacao.');
      return;
    }

    updateStatus(noteModalAction, note.trim());
  }

  if (loading) {
    return <LoadingIndicator text="Carregando prestador..." />;
  }

  if (!prestador) {
    return (
      <AdminPage title="Detalhes do prestador" back={() => navigation.goBack()}>
        <AdminMessage danger>{error || 'Prestador não encontrado.'}</AdminMessage>
      </AdminPage>
    );
  }

  return (
    <View style={styles.root}>
      <AdminPage title="Detalhes do prestador" back={() => navigation.goBack()}
        refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={styles.identity}>
        <CatalogImage authenticated fotoUrl={prestador.foto_url || prestador.solicitante_foto_url} kind="provider" style={styles.avatar} />
        <Text style={styles.title}>{prestador.nome_estab}</Text>
        <Text style={styles.statusBadge}>{prestador.status === 'pendente' ? 'Aguardando aprovação' : prestador.status}</Text>
        </View>

        <View style={[adminV4.card, styles.detailsCard]}>
          <InfoRow label="Responsável" value={[responsavel?.nome, responsavel?.sobrenome].filter(Boolean).join(' ') || 'Não informado'} />
          <InfoRow label="Estabelecimento" value={prestador.nome_estab} />
          <InfoRow label="E-mail" value={responsavel?.email || 'Não informado'} />
          <InfoRow label="Cidade de atendimento" value={[prestador.cidade, prestador.estado].filter(Boolean).join(' - ') || 'Não informada'} />
          <InfoRow label="CPF/CNPJ" value={prestador.documento || 'Não informado'} />
          <InfoRow label="Endereço do estabelecimento" value={formatAddress(prestador)} />
          <InfoRow label="Enviado em" value={formatDate(prestador.enviado_em)} />
          {prestador.aprovado_em ? <InfoRow label="Aprovado em" value={formatDate(prestador.aprovado_em)} /> : null}
          {prestador.motivo_rejeicao ? <InfoRow label="Observação" value={prestador.motivo_rejeicao} /> : null}
        </View>

        <Section title="Serviços">
          {prestador.servicos.length ? (
            prestador.servicos.map((servico) => (
              <View key={servico.id} style={styles.serviceItem}>
                <CatalogImage authenticated fotoUrl={servico.foto_url} kind="service" style={styles.serviceImage} />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={2}>{servico.nome}</Text>
                  <Text style={styles.serviceMeta}>
                    {Number(servico.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {servico.duracao_min} min
                  </Text>
                  <Text style={styles.serviceStatus}>{servico.status === 'ativo' ? 'Disponível' : 'Inativo'}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.cardText}>Nenhum serviço cadastrado.</Text>
          )}
        </Section>

        <Section title="Horários">
          <Text style={styles.cardText}>{horariosResumo}</Text>
        </Section>

        {error ? <AdminMessage danger>{error}</AdminMessage> : null}

        {statusActions.length ? (
          <View style={styles.actions}>
            {statusActions.filter(action => width >= 900 || prestador.status !== 'pendente' || action.status === 'rascunho').map((action) => <AdminAction key={`${prestador.status}-${action.status}`}
              label={savingStatus === action.status ? 'Salvando…' : action.label}
              kind={action.variant === 'outline' ? 'secondary' : action.variant}
              disabled={savingStatus !== null} onPress={() => requestStatusUpdate(action)} />)}
          </View>
        ) : (
          <View style={adminV4.card}>
            <Text style={styles.cardText}>Nao ha alteracoes de status disponiveis neste momento.</Text>
          </View>
        )}
      </AdminPage>

      {width < 900 && prestador.status === 'pendente' ? <View style={styles.bottomBar}>
        {statusActions.filter(action => action.status === 'rejeitado' || action.status === 'ativo').map(action =>
          <View key={action.status} style={styles.bottomAction}><AdminAction label={action.status === 'ativo' ? 'Aceitar' : 'Recusar'}
            kind={action.variant === 'danger' ? 'danger' : 'primary'} disabled={savingStatus !== null} onPress={() => requestStatusUpdate(action)} /></View>)}
      </View> : null}

      <Modal visible={!!sucesso} transparent animationType="fade" onRequestClose={() => { setSucesso(''); navigation.goBack(); }}>
        <View style={styles.successBackdrop}><View style={styles.successDialog}>
          <Text style={styles.successCheck}>✓</Text>
          <Text style={adminV4.heading}>{prestador.status === 'ativo' ? 'Cadastro aprovado!' : 'Status atualizado'}</Text>
          <Text style={adminV4.body}>{sucesso}</Text>
          <AdminAction label="OK" onPress={() => { setSucesso(''); navigation.goBack(); }} />
        </View></View>
      </Modal>

      <Modal visible={!!confirmAction} transparent animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <View style={styles.successBackdrop}><View style={styles.successDialog}>
          <Text style={adminV4.heading}>{confirmAction?.status === 'suspenso' ? 'Suspender prestador' : 'Reativar prestador'}</Text>
          <Text style={adminV4.body}>{confirmAction?.status === 'suspenso'
            ? 'O prestador deixará de aparecer no catálogo público. Deseja continuar?'
            : 'O prestador voltará a aparecer no catálogo público. Deseja continuar?'}</Text>
          <AdminAction label="Cancelar" kind="secondary" onPress={() => setConfirmAction(null)} />
          <AdminAction label="Confirmar" kind={confirmAction?.status === 'suspenso' ? 'danger' : 'primary'}
            disabled={savingStatus !== null} onPress={() => { const action = confirmAction; setConfirmAction(null); if (action) void updateStatus(action.status); }} />
        </View></View>
      </Modal>

      <Modal transparent visible={noteModalAction !== null} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {noteModalAction === 'rascunho' ? 'Solicitar correcao' : 'Rejeitar cadastro'}
            </Text>
            <Input
              appearance="customer"
              label="Motivo ou observacao"
              placeholder="Descreva o ajuste necessario"
              value={note}
              onChangeText={setNote}
              multiline
            />
            {error ? <AdminMessage danger>{error}</AdminMessage> : null}
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}><AdminAction label="Cancelar" kind="secondary" disabled={savingStatus !== null} onPress={() => setNoteModalAction(null)} /></View>
              <View style={{ flex: 1 }}><AdminAction label={savingStatus ? 'Salvando…' : 'Confirmar'} disabled={savingStatus !== null} onPress={confirmNoteAction} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={[adminV4.card, styles.detailsCard]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: A.bg },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', padding: 20, shadowColor: A.primaryDeep, shadowOffset: { width: 0, height: -6 },
    shadowOpacity: .1, shadowRadius: 20, elevation: 8 },
  bottomAction: { flex: 1 },
  identity: { alignItems: 'center', gap: 10 },
  avatar: {
    alignSelf: 'center',
    borderRadius: 48,
    height: 96,
    width: 96,
  },
  title: {
    color: A.text,
    fontFamily: A.fontDisplay,
    fontSize: 25,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#FFF0D6',
    borderRadius: 16,
    color: '#9A5200',
    fontFamily: A.fontBodySemi,
    fontSize: 14,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    textTransform: 'capitalize',
  },
  detailsCard: {
    gap: 0,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: A.border,
    gap: 4,
    paddingVertical: 12,
  },
  infoLabel: {
    color: A.textMuted,
    fontFamily: A.fontBody,
    fontSize: 14,
  },
  infoValue: {
    color: A.text,
    fontFamily: A.fontBodySemi,
    fontSize: 16,
  },
  sectionTitle: {
    color: A.text,
    fontFamily: A.fontDisplay,
    fontSize: 20,
  },
  serviceItem: { backgroundColor: A.field, borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  serviceImage: { width: 72, height: 72, borderRadius: 14 },
  serviceInfo: { flex: 1, minWidth: 0, gap: 4 },
  serviceName: { color: A.text, fontFamily: A.fontBodyBold, fontSize: 16, lineHeight: 21 },
  serviceMeta: { color: A.textMuted, fontFamily: A.fontBody, fontSize: 14, lineHeight: 19 },
  serviceStatus: { color: A.primary, fontFamily: A.fontBodySemi, fontSize: 13 },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  actions: { gap: 10 },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(46,10,87,0.62)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: theme.spacing.md,
    padding: 20,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  successBackdrop: { flex: 1, backgroundColor: 'rgba(46,10,87,0.62)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  successDialog: { width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: '#fff', padding: 24, gap: 16, alignItems: 'center' },
  successCheck: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#DDF5EA', overflow: 'hidden', textAlign: 'center',
    textAlignVertical: 'center', color: A.success, fontSize: 40 },
});
