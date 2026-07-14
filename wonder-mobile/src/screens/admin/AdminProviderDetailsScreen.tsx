import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { Input } from '../../components/Input';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { AdminProvidersStackParamList } from '../../navigation/AdminProvidersStack';
import { atualizarStatusPrestadorAdmin, obterPrestadorAdmin } from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminPrestadorDetalhe, AdminPrestadorStatus } from '../../types/admin';

type Route = RouteProp<AdminProvidersStackParamList, 'AdminProviderDetails'>;
type Navigation = NativeStackNavigationProp<AdminProvidersStackParamList, 'AdminProviderDetails'>;
type NoteAction = 'rejeitado' | 'rascunho';

const dayLabels = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR');
}

export function AdminProviderDetailsScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const [prestador, setPrestador] = useState<AdminPrestadorDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStatus, setSavingStatus] = useState<AdminPrestadorStatus | null>(null);
  const [error, setError] = useState('');
  const [noteModalAction, setNoteModalAction] = useState<NoteAction | null>(null);
  const [note, setNote] = useState('');

  const horariosResumo = useMemo(() => {
    if (!prestador?.horarios.length) {
      return 'Nenhum horario cadastrado.';
    }

    return prestador.horarios
      .map((horario) => {
        const dia = dayLabels[horario.dia_semana] || 'Dia';
        return `${dia}: ${horario.hora_inicio} - ${horario.hora_fim}`;
      })
      .join('\n');
  }, [prestador]);

  const load = useCallback(async () => {
    setError('');
    try {
      setPrestador(await obterPrestadorAdmin(route.params.prestadorId));
    } catch {
      setError('Nao foi possivel carregar o detalhe do prestador.');
    }
  }, [route.params.prestadorId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function updateStatus(status: AdminPrestadorStatus, motivo?: string) {
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
    } catch {
      setError('Nao foi possivel atualizar o status do prestador.');
    } finally {
      setSavingStatus(null);
    }
  }

  function openNoteModal(action: NoteAction) {
    setNote('');
    setNoteModalAction(action);
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
      <View style={styles.container}>
        <Button title="Voltar" size="sm" variant="secondary" onPress={() => navigation.goBack()} />
        <Card>
          <Text style={styles.error}>{error || 'Prestador nao encontrado.'}</Text>
        </Card>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <Button title="Voltar" size="sm" variant="secondary" onPress={() => navigation.goBack()} />
          <Text style={styles.statusBadge}>{prestador.status}</Text>
        </View>

        <CatalogImage fotoUrl={prestador.foto_url} kind="provider" style={styles.avatar} />

        <Text style={styles.title}>{prestador.nome_estab}</Text>

        <Card style={styles.detailsCard}>
          <InfoRow label="Usuario vinculado" value={String(prestador.usuario_id)} />
          <InfoRow label="Documento" value={prestador.documento} />
          <InfoRow label="Enviado em" value={formatDate(prestador.enviado_em)} />
          <InfoRow label="Aprovado em" value={formatDate(prestador.aprovado_em)} />
          <InfoRow label="Aprovado por" value={prestador.aprovado_por || '-'} />
          <InfoRow label="Observacao" value={prestador.motivo_rejeicao || '-'} />
        </Card>

        <Section title="Servicos">
          {prestador.servicos.length ? (
            prestador.servicos.map((servico) => (
              <View key={servico.id} style={styles.inlineItem}>
                <Text style={styles.inlineTitle}>{servico.nome}</Text>
                <Text style={styles.inlineText}>
                  R$ {servico.preco.toFixed(2)} - {servico.duracao_min} min
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.cardText}>Nenhum servico cadastrado.</Text>
          )}
        </Section>

        <Section title="Horarios">
          <Text style={styles.cardText}>{horariosResumo}</Text>
        </Section>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button
            title="Aprovar"
            loading={savingStatus === 'ativo'}
            disabled={savingStatus !== null || prestador.status !== 'pendente'}
            onPress={() => updateStatus('ativo')}
          />
          <Button
            title="Solicitar correcao"
            variant="outline"
            disabled={savingStatus !== null || prestador.status !== 'pendente'}
            onPress={() => openNoteModal('rascunho')}
          />
          <Button
            title="Rejeitar"
            variant="danger"
            disabled={savingStatus !== null || prestador.status !== 'pendente'}
            onPress={() => openNoteModal('rejeitado')}
          />
        </View>
      </ScrollView>

      <Modal transparent visible={noteModalAction !== null} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {noteModalAction === 'rascunho' ? 'Solicitar correcao' : 'Rejeitar cadastro'}
            </Text>
            <Input
              label="Motivo ou observacao"
              placeholder="Descreva o ajuste necessario"
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="secondary" onPress={() => setNoteModalAction(null)} />
              <Button title="Confirmar" loading={savingStatus !== null} onPress={confirmNoteAction} />
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    <Card style={styles.detailsCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    alignSelf: 'center',
    borderColor: theme.colors.primary,
    borderRadius: 72,
    borderWidth: 2,
    height: 144,
    width: 144,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.white,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  detailsCard: {
    gap: theme.spacing.sm,
  },
  infoRow: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  infoLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  infoValue: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  inlineItem: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  inlineTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  inlineText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    width: '100%',
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
});
