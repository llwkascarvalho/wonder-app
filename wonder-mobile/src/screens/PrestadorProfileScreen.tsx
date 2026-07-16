import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { ServiceCard } from '../components/catalog/ServiceCard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import {
  listarCategoriasPrestador,
  listarHorariosPrestador,
  listarServicosPrestador,
  obterPrestador,
} from '../services/catalogo';
import { theme } from '../styles/theme';
import {
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      try {
        const [prestadorData, servicosData, horariosData, categoriasData] =
          await Promise.all([
            obterPrestador(prestadorId),
            listarServicosPrestador(prestadorId),
            listarHorariosPrestador(prestadorId),
            listarCategoriasPrestador(prestadorId),
          ]);

        if (!ativo) return;

        setPrestador(prestadorData);
        setServicos(servicosData);
        setHorarios(horariosData);
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

  const enderecoFormatado = formatAddress(prestador);
  const temEndereco = hasAddress(prestador);

  function openMaps() {
    if (!temEndereco) {
      return;
    }

    const query = encodeURIComponent(enderecoFormatado.replace(/\n/g, ', '));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <CatalogImage fotoUrl={prestador.foto_url} kind="provider" style={styles.photo} />

        <View style={styles.headerContent}>
          <Text style={styles.title}>{prestador.nome_estab}</Text>
          <Text style={styles.subtitle}>
            {prestador.status === 'ativo' ? 'Disponivel para agendamentos' : prestador.status}
          </Text>
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

      <Text style={styles.sectionTitle}>Localizacao</Text>
      <Card style={styles.locationCard}>
        <Text style={styles.cardText}>{temEndereco ? enderecoFormatado : 'Endereco nao informado.'}</Text>
        {temEndereco ? (
          <Button title="Ver no Google Maps" variant="secondary" onPress={openMaps} />
        ) : null}
      </Card>

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
            <ServiceCard key={item.id} servico={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function hasAddress(prestador: Prestador) {
  return Boolean(
    prestador.endereco?.trim() ||
      prestador.numero?.trim() ||
      prestador.bairro?.trim() ||
      prestador.cidade?.trim() ||
      prestador.estado?.trim()
  );
}

function formatAddress(prestador: Prestador) {
  const linhaEndereco = [prestador.endereco, prestador.numero].filter(Boolean).join(', ');
  const linhaCidade = [prestador.cidade, prestador.estado].filter(Boolean).join(' - ');
  return [linhaEndereco, prestador.bairro, linhaCidade].filter(Boolean).join('\n');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
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
    borderRadius: theme.borderRadius.lg,
    height: 96,
    width: 96,
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
  locationCard: {
    gap: theme.spacing.sm,
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
