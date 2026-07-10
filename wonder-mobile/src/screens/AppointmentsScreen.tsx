import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { atualizarStatusAgendamento, extrairMensagemErro, listarAgendamentos } from '../services/agendamentos';
import { theme } from '../styles/theme';
import { Agendamento } from '../types/agendamento';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

function formatarData(inicio: string): string {
  const data = new Date(inicio);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AppointmentsScreen() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);

  const carregarAgendamentos = useCallback(async () => {
    setErro(null);

    try {
      const resultado = await listarAgendamentos();
      resultado.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
      setAgendamentos(resultado);
    } catch {
      setErro('Não foi possível carregar seus agendamentos.');
    }
  }, []);

  useEffect(() => {
    setCarregando(true);
    carregarAgendamentos().finally(() => setCarregando(false));
  }, [carregarAgendamentos]);

  async function handleRefresh() {
    setAtualizando(true);
    await carregarAgendamentos();
    setAtualizando(false);
  }

  function confirmarCancelamento(agendamento: Agendamento) {
    Alert.alert(
      'Cancelar agendamento',
      `Deseja realmente cancelar o agendamento de ${formatarData(agendamento.inicio)}?`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar agendamento',
          style: 'destructive',
          onPress: () => cancelarAgendamento(agendamento.id),
        },
      ]
    );
  }

  async function cancelarAgendamento(agendamentoId: number) {
    setCancelandoId(agendamentoId);

    try {
      await atualizarStatusAgendamento(agendamentoId, {
        status: 'cancelado',
        motivo: 'Cancelado pelo cliente via app.',
      });
      await carregarAgendamentos();
    } catch (error) {
      Alert.alert(
        'Não foi possível cancelar',
        extrairMensagemErro(error, 'Tente novamente em instantes.')
      );
    } finally {
      setCancelandoId(null);
    }
  }

  if (carregando) {
    return <LoadingIndicator text="Carregando agendamentos..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Seus horários marcados com prestadores Wonder.</Text>

      {erro ? (
        <Card>
          <Text style={styles.cardText}>{erro}</Text>
        </Card>
      ) : (
        <FlatList
          data={agendamentos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Card>
              <Text style={styles.cardText}>Você ainda não tem agendamentos.</Text>
            </Card>
          }
          renderItem={({ item }) => {
            const cancelavel = item.status !== 'cancelado' && item.status !== 'concluido';

            return (
              <Card style={styles.agendamentoCard}>
                <Text style={styles.cardTitle}>{formatarData(item.inicio)}</Text>
                <Text style={styles.statusText}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>

                {cancelavel ? (
                  <Button
                    title="Cancelar"
                    variant="danger"
                    size="sm"
                    loading={cancelandoId === item.id}
                    disabled={cancelandoId !== null}
                    onPress={() => confirmarCancelamento(item)}
                  />
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  list: {
    gap: theme.spacing.sm,
  },
  agendamentoCard: {
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  statusText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
});
