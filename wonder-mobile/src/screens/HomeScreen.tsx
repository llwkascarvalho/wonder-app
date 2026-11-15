import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { CategoryCard } from '../components/catalog/CategoryCard';
import { ProviderCard } from '../components/catalog/ProviderCard';
import { CustomerHeader } from '../components/customer/CustomerHeader';
import { CustomerHomeSkeleton } from '../components/customer/CustomerHomeSkeleton';
import { listarCategorias, listarPrestadores } from '../services/catalogo';
import { customerTheme } from '../styles/customerTheme';
import { Categoria } from '../types/catalogo';
import { carregarCardsPrestadores, ProviderCardModel } from '../utils/catalogPresentation';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<ProviderCardModel[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [carregandoPrestadores, setCarregandoPrestadores] = useState(true);
  const [erroCategorias, setErroCategorias] = useState<string | null>(null);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);

  useEffect(() => {
    const controle = new AbortController();

    async function carregarCategorias() {
      setCarregandoCategorias(true);

      try {
        const resultado = await listarCategorias(controle.signal);
        if (!controle.signal.aborted) {
          setCategorias(resultado);
          setErroCategorias(null);
        }
      } catch {
        if (!controle.signal.aborted) {
          setCategorias([]);
          setErroCategorias('Nao foi possivel carregar as categorias da API.');
        }
      } finally {
        if (!controle.signal.aborted) setCarregandoCategorias(false);
      }
    }

    carregarCategorias();
    return () => {
      controle.abort();
    };
  }, []);

  const carregarPrestadores = useCallback(async (signal: AbortSignal) => {
    setCarregandoPrestadores(true);
    setErroPrestadores(null);

    try {
      const resultado = await listarPrestadores({
        categoria_id: categoriaSelecionada ?? undefined,
      }, signal);
      const cards = await carregarCardsPrestadores(resultado, signal);
      if (!signal.aborted) setPrestadores(cards);
    } catch {
      if (!signal.aborted) setErroPrestadores('Nao foi possivel carregar os prestadores.');
    } finally {
      if (!signal.aborted) setCarregandoPrestadores(false);
    }
  }, [categoriaSelecionada]);

  useEffect(() => {
    const controle = new AbortController();
    carregarPrestadores(controle.signal);
    return () => controle.abort();
  }, [carregarPrestadores]);

  function abrirPrestador(prestadorId: number) {
    navigation.navigate('Search', {
      screen: 'PrestadorProfile',
      params: { prestadorId },
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
        <CustomerHeader />
        <View style={styles.intro}>
          <Text style={styles.title}>Sua beleza em boas mãos!</Text>
          <Text style={styles.description}>Serviços perto de você.</Text>
        </View>

        {carregandoCategorias && carregandoPrestadores ? <CustomerHomeSkeleton /> : <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </Pressable>
        </View>
        {erroCategorias ? (
        <Card>
          <Text style={styles.cardText}>{erroCategorias}</Text>
        </Card>
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

        <Text style={styles.sectionTitle}>Para você</Text>
        {erroPrestadores ? (
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
        </>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.colors.background, flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flexGrow: 1,
    gap: 14,
    maxWidth: 560,
    paddingBottom: 110,
    paddingHorizontal: 20,
    width: '100%',
    alignSelf: 'center',
  },
  intro: { gap: 2, marginTop: 2 },
  title: {
    color: customerTheme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  description: { color: customerTheme.colors.textSecondary, fontSize: 13 },
  sectionHeader: {
    alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2,
  },
  sectionTitle: {
    color: customerTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  seeAll: { color: customerTheme.colors.brand, fontSize: 12, fontWeight: '600' },
  categoriesList: {
    gap: 10,
    paddingRight: 20,
  },
  categoriesScroller: {
    flexGrow: 0,
    maxHeight: 96,
  },
  providersList: {
    gap: 14,
  },
  cardText: {
    color: customerTheme.colors.textSecondary,
    fontSize: 13,
  },
});
