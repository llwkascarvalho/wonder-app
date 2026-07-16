import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { useNotifications } from '../contexts/NotificationsContext';
import { listarNotificacoes, marcarNotificacaoComoLida } from '../services/notificacoes';
import { theme } from '../styles/theme';
import { Notificacao } from '../types/notificacao';
import { formatBackendDateTime, parseBackendDate } from '../utils/dateTime';

function formatarData(criadoEm: string): string {
  return formatBackendDateTime(criadoEm, criadoEm, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsScreen() {
  const { refreshUnreadCount } = useNotifications();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const resultado = await listarNotificacoes();
      resultado.sort(
        (a, b) => parseBackendDate(b.criado_em).getTime() - parseBackendDate(a.criado_em).getTime(),
      );
      setNotificacoes(resultado);
    } catch {
      setErro('Não foi possível carregar suas notificações.');
    }
  }, []);

  useEffect(() => {
    setCarregando(true);
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  async function handleRefresh() {
    setAtualizando(true);
    await carregar();
    await refreshUnreadCount();
    setAtualizando(false);
  }

  async function marcarComoLida(notificacao: Notificacao) {
    if (notificacao.status === 'lida') return;

    // Atualização otimista: a lista muda na hora, sem esperar a resposta
    // do servidor nem recarregar tudo de novo.
    setNotificacoes((atual) =>
      atual.map((item) => (item.id === notificacao.id ? { ...item, status: 'lida' } : item))
    );

    try {
      await marcarNotificacaoComoLida(notificacao.id);
      refreshUnreadCount();
    } catch {
      // Se falhar, desfaz a atualização otimista.
      setNotificacoes((atual) =>
        atual.map((item) =>
          item.id === notificacao.id ? { ...item, status: notificacao.status } : item
        )
      );
    }
  }

  if (carregando) {
    return <LoadingIndicator text="Carregando notificações..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificações</Text>

      {erro ? (
        <Card>
          <Text style={styles.cardText}>{erro}</Text>
        </Card>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <Card>
              <Text style={styles.cardText}>Você ainda não tem notificações.</Text>
            </Card>
          }
          renderItem={({ item }) => {
            const naoLida = item.status !== 'lida';

            return (
              <Card
                onPress={() => marcarComoLida(item)}
                style={[styles.notificacaoCard, naoLida && styles.notificacaoCardNaoLida]}
              >
                <View style={styles.notificacaoHeader}>
                  {naoLida ? <View style={styles.pontoNaoLido} /> : null}
                  <Text style={styles.dataText}>{formatarData(item.criado_em)}</Text>
                </View>
                <Text style={[styles.mensagemText, naoLida && styles.mensagemTextNaoLida]}>
                  {item.mensagem}
                </Text>
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
    paddingTop: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  list: {
    gap: theme.spacing.sm,
  },
  notificacaoCard: {
    gap: theme.spacing.xs,
  },
  notificacaoCardNaoLida: {
    borderColor: theme.colors.primary,
  },
  notificacaoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  pontoNaoLido: {
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dataText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  mensagemText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  mensagemTextNaoLida: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
