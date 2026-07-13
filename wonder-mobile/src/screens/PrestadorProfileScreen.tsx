import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import {
  listarAvaliacoesPrestador,
  listarCategoriasPrestador,
  listarHorariosPrestador,
  listarServicosPrestador,
  obterPrestador,
} from '../services/catalogo';
import { resolveProfilePhotoUrl } from '../services/profileService';
import { theme } from '../styles/theme';
import {
  Avaliacao,
  Categoria,
  DIAS_SEMANA,
  Horario,
  Prestador,
  Servico,
} from '../types/catalogo';

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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      try {
        const [prestadorData, servicosData, horariosData, avaliacoesData, categoriasData] =
          await Promise.all([
            obterPrestador(prestadorId),
            listarServicosPrestador(prestadorId),
            listarHorariosPrestador(prestadorId),
            listarAvaliacoesPrestador(prestadorId),
            listarCategoriasPrestador(prestadorId),
          ]);

        if (!ativo) return;

        setPrestador(prestadorData);
        setServicos(servicosData);
        setHorarios(horariosData);
        setAvaliacoes(avaliacoesData);
        setCategorias(categoriasData);
      } catch {
        if (ativo) setErro('Nao foi possivel carregar os dados do prestador.');
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
          <Text style={styles.cardText}>{erro || 'Prestador nao encontrado.'}</Text>
        </Card>
      </View>
    );
  }

  const mediaAvaliacao =
    avaliacoes.length > 0
      ? avaliacoes.reduce((soma, item) => soma + item.nota, 0) / avaliacoes.length
      : null;
  const fotoUrl = resolveProfilePhotoUrl(prestador.foto_url);
  const initial = prestador.nome_estab.trim().slice(0, 1).toUpperCase() || 'W';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.photo}>
          {fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={styles.photoImage} />
          ) : (
            <Text style={styles.photoInitial}>{initial}</Text>
          )}
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>{prestador.nome_estab}</Text>
          <Text style={styles.subtitle}>
            {prestador.status === 'ativo' ? 'Disponivel para agendamentos' : prestador.status}
          </Text>
          {mediaAvaliacao !== null ? (
            <Text style={styles.avaliacaoText}>
              {mediaAvaliacao.toFixed(1)} de 5 ({avaliacoes.length}{' '}
              {avaliacoes.length === 1 ? 'avaliacao' : 'avaliacoes'})
            </Text>
          ) : (
            <Text style={styles.subtitle}>Ainda sem avaliacoes</Text>
          )}
        </View>
      </View>

      {categorias.length > 0 ? (
        <View style={styles.chips}>
          {categorias.map((categoria) => (
            <View key={categoria.id} style={styles.chip}>
              <Text style={styles.chipText}>{categoria.nome}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.subtitle}>Categorias nao informadas</Text>
      )}

      <Button
        title="Agendar servico"
        size="lg"
        onPress={() => navigation.navigate('Agendamento', { prestadorId: prestador.id })}
      />

      <Text style={styles.sectionTitle}>Horarios de funcionamento</Text>
      {horarios.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhum horario cadastrado ainda.</Text>
        </Card>
      ) : (
        <Card style={styles.list}>
          {horarios.map((horario) => (
            <Text key={horario.id} style={styles.cardText}>
              {DIAS_SEMANA[horario.dia_semana] ?? `Dia ${horario.dia_semana}`}:{' '}
              {horario.hora_inicio.slice(0, 5)} as {horario.hora_fim.slice(0, 5)}
            </Text>
          ))}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Servicos</Text>
      {servicos.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhum servico cadastrado ainda.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {servicos.map((item) => (
            <Card key={item.id} style={styles.servicoCard}>
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardText}>
                R$ {item.preco.toFixed(2)} - {item.duracao_min} min
              </Text>
            </Card>
          ))}
        </View>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  photo: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  photoImage: {
    height: '100%',
    width: '100%',
  },
  photoInitial: {
    color: theme.colors.white,
    fontSize: 36,
    fontWeight: theme.fontWeight.bold,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: '#F3E8FF',
    borderRadius: theme.borderRadius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
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
