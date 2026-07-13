import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { CategoryCard } from '../components/catalog/CategoryCard';
import { ProviderCard } from '../components/catalog/ProviderCard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { listarCategorias, listarPrestadores } from '../services/catalogo';
import { theme } from '../styles/theme';
import { Categoria } from '../types/catalogo';
import { carregarCardsPrestadores, ProviderCardModel } from '../utils/catalogPresentation';

export function HomeScreen() {
  const navigation = useNavigation<any>();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<ProviderCardModel[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [carregandoPrestadores, setCarregandoPrestadores] = useState(true);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarCategorias() {
      setCarregandoCategorias(true);

      try {
        const resultado = await listarCategorias();
        if (ativo) setCategorias(resultado);
      } catch {
        if (ativo) setCategorias([]);
      } finally {
        if (ativo) setCarregandoCategorias(false);
      }
    }

    carregarCategorias();
    return () => {
      ativo = false;
    };
  }, []);

  const carregarPrestadores = useCallback(async () => {
    setCarregandoPrestadores(true);
    setErroPrestadores(null);

    try {
      const resultado = await listarPrestadores({
        categoria_id: categoriaSelecionada ?? undefined,
      });
      const cards = await carregarCardsPrestadores(resultado);
      setPrestadores(cards);
    } catch {
      setErroPrestadores('Nao foi possivel carregar os prestadores.');
    } finally {
      setCarregandoPrestadores(false);
    }
  }, [categoriaSelecionada]);

  useEffect(() => {
    carregarPrestadores();
  }, [carregarPrestadores]);

  function abrirPrestador(prestadorId: number) {
    navigation.navigate('Search', {
      screen: 'PrestadorProfile',
      params: { prestadorId },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Categorias</Text>
      {carregandoCategorias ? (
        <LoadingIndicator text="Carregando categorias..." />
      ) : categorias.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhuma categoria disponivel.</Text>
        </Card>
      ) : (
        <FlatList
          data={categorias}
          horizontal
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroller}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <CategoryCard
              categoria={item}
              selected={categoriaSelecionada === item.id}
              onPress={() =>
                setCategoriaSelecionada(categoriaSelecionada === item.id ? null : item.id)
              }
            />
          )}
        />
      )}

      <Text style={styles.sectionTitle}>Para voce</Text>
      {carregandoPrestadores ? (
        <LoadingIndicator text="Carregando prestadores..." />
      ) : erroPrestadores ? (
        <Card>
          <Text style={styles.cardText}>{erroPrestadores}</Text>
        </Card>
      ) : prestadores.length === 0 ? (
        <Card>
          <Text style={styles.cardText}>Nenhum prestador encontrado.</Text>
        </Card>
      ) : (
        <View style={styles.providersList}>
          {prestadores.map((item) => (
            <ProviderCard
              key={item.prestador.id}
              provider={item}
              onPress={() => abrirPrestador(item.prestador.id)}
            />
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
    paddingTop: theme.spacing.xxl,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  categoriesList: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.lg,
  },
  categoriesScroller: {
    flexGrow: 0,
    maxHeight: 124,
  },
  providersList: {
    gap: theme.spacing.sm,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
