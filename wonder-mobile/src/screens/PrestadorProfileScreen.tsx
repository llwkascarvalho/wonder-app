import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import {
  listarAvaliacoesPrestador,
  listarHorariosPrestador,
  listarServicosPrestador,
  obterPrestador,
} from '../services/catalogo';
import { theme } from '../styles/theme';
import { Avaliacao, DIAS_SEMANA, Horario, Prestador, Servico } from '../types/catalogo';

type PrestadorProfileRouteProp = {
  key: string;
  name: 'PrestadorProfile';
  params: SearchStackParamList['PrestadorProfile'];
};

type PrestadorProfileNavigationProp = NativeStackNavigationProp<
  SearchStackParamList,
  'PrestadorProfile'
>;

export function PrestadorProfileScreen() {
  const navigation = useNavigation<PrestadorProfileNavigationProp>();
  const route = useRoute<PrestadorProfileRouteProp>();
  const { prestadorId } = route.params;

  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      try {
        const [prestadorData, servicosData, horariosData, avaliacoesData] = await Promise.all([
          obterPrestador(prestadorId),
          listarServicosPrestador(prestadorId),
          listarHorariosPrestador(prestadorId),
          listarAvaliacoesPrestador(prestadorId),
        ]);

        if (!ativo) return;

        setPrestador(prestadorData);
        setServicos(servicosData);
        setHorarios(horariosData);
        setAvaliacoes(avaliacoesData);
      } catch {
        if (ativo) setErro('Não foi possível carregar os dados do prestador.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [prestadorId]);

  if (carregando) {
    return <LoadingIndicator text="Carregando prestador..." />;
  }

  if (erro || !prestador) {
    return (
      <View style={styles.container}>
        <Card>
          <Text style={styles.cardText}>{erro || 'Prestador não encontrado.'}</Text>
        </Card>
      </View>
    );
  }

  const mediaAvaliacao =
    avaliacoes.length > 0
      ? avaliacoes.reduce((soma, item) => soma + item.nota, 0) / avaliacoes.length
      : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{prestador.nome_estab}</Text>
      <Text style={styles.subtitle}>
        {prestador.status === 'ativo' ? 'Disponível para agendamentos' : prestador.status}
      </Text>

      {mediaAvaliacao !== null ? (
        <Text style={styles.avaliacaoText}>
          {'★'.repeat(Math.round(mediaAvaliacao))}
          {'☆'.repeat(5 - Math.round(mediaAvaliacao))} {mediaAvaliacao.toFixed(1)} (
          {avaliacoes.length} avaliação{avaliacoes.length === 1 ? '' : 'ões'})
        </Text>
      ) : (
        <Text style={styles.subtitle}>Ainda sem avaliações</Text>
      )}

      <Text style={styles.sectionTitle}>Serviços</Text>
      {servicos.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhum serviço cadastrado ainda.</Text>
        </Card>
      ) : (
        <FlatList
          data={servicos}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              onPress={() =>
                navigation.navigate('Agendamento', {
                  prestadorId: prestador.id,
                  servicoId: item.id,
                })
              }
              style={styles.servicoCard}
            >
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardText}>
                R$ {item.preco.toFixed(2)} · {item.duracao_min} min
              </Text>
            </Card>
          )}
        />
      )}

      <Text style={styles.sectionTitle}>Horários de funcionamento</Text>
      {horarios.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhum horário cadastrado ainda.</Text>
        </Card>
      ) : (
        <Card style={styles.list}>
          {horarios.map((horario) => (
            <Text key={horario.id} style={styles.cardText}>
              {DIAS_SEMANA[horario.dia_semana] ?? `Dia ${horario.dia_semana}`}:{' '}
              {horario.hora_inicio.slice(0, 5)} às {horario.hora_fim.slice(0, 5)}
            </Text>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  avaliacaoText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.sm,
  },
  servicoCard: {
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
