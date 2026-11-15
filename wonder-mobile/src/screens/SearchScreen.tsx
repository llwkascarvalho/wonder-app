import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { ProviderCard } from '../components/catalog/ProviderCard';
import { CustomerHeader } from '../components/customer/CustomerHeader';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import { listarCategorias, listarPrestadores } from '../services/catalogo';
import { customerTheme } from '../styles/customerTheme';
import { Categoria } from '../types/catalogo';
import { carregarCardsPrestadores, ProviderCardModel } from '../utils/catalogPresentation';

type SearchScreenNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'SearchHome'>;

export function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<ProviderCardModel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const mostrandoResultados = Boolean(nome.trim() || categoriaSelecionada);
  const categoriaAtual = categorias.find((item) => item.id === categoriaSelecionada);

  const buscarPrestadores = useCallback(async (signal: AbortSignal) => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listarPrestadores({
        nome: nome.trim() || undefined,
        categoria_id: categoriaSelecionada ?? undefined,
      }, signal);
      const cards = await carregarCardsPrestadores(resultado, signal);
      if (!signal.aborted) setPrestadores(cards);
    } catch {
      if (!signal.aborted) setErro('Não foi possível carregar os prestadores. Tente novamente.');
    } finally {
      if (!signal.aborted) setCarregando(false);
    }
  }, [nome, categoriaSelecionada]);

  useEffect(() => {
    const controle = new AbortController();
    listarCategorias(controle.signal)
      .then((resultado) => { if (!controle.signal.aborted) setCategorias(resultado); })
      .catch(() => { if (!controle.signal.aborted) setCategorias([]); });
    return () => controle.abort();
  }, []);

  useFocusEffect(useCallback(() => {
    const controle = new AbortController();
    const timeout = setTimeout(() => buscarPrestadores(controle.signal), 350);
    return () => { clearTimeout(timeout); controle.abort(); };
  }, [buscarPrestadores]));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
        <CustomerHeader />
        <View style={styles.intro}>
          <Text style={styles.title}>{categoriaAtual?.nome || (mostrandoResultados ? 'Resultados' : 'Buscar')}</Text>
          <Text style={styles.description}>{mostrandoResultados
            ? `${prestadores.length} ${prestadores.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}.`
            : 'Encontre serviços e estabelecimentos.'}</Text>
        </View>

        <View style={styles.searchField}>
          <MaterialIcons name="search" size={20} color={customerTheme.colors.brand} />
          <TextInput
            accessibilityLabel="Buscar por nome ou serviço"
            placeholder="Buscar por nome ou serviço"
            placeholderTextColor={customerTheme.colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            style={styles.searchInput}
          />
        </View>

        {!mostrandoResultados ? (
          <View style={styles.exploreSection}>
            <Text style={styles.sectionTitle}>Explore por categoria</Text>
            <View style={styles.categoryGrid}>
              {categorias.map((categoria) => (
                <Pressable
                  accessibilityRole="button"
                  key={categoria.id}
                  onPress={() => setCategoriaSelecionada(categoria.id)}
                  style={({ pressed }) => [styles.categoryTile, pressed && styles.pressed]}
                >
                  <CatalogImage fotoUrl={categoria.foto_url} kind="category" style={styles.categoryImage} />
                  <View style={styles.categoryOverlay} />
                  <Text style={styles.categoryName} numberOfLines={1}>{categoria.nome}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filters}
            >
              <FilterChip active={categoriaSelecionada === null} label="Todos" onPress={() => setCategoriaSelecionada(null)} />
              {categoriaAtual ? (
                <FilterChip active label={categoriaAtual.nome} onPress={() => setCategoriaSelecionada(null)} />
              ) : null}
            </ScrollView>
            {carregando ? <LoadingIndicator text="Buscando prestadores..." /> : erro ? (
              <Card><Text style={styles.message}>{erro}</Text></Card>
            ) : prestadores.length === 0 ? (
              <Card><Text style={styles.message}>Nenhum prestador encontrado.</Text></Card>
            ) : (
              <View style={styles.results}>
                {prestadores.map((item) => (
                  <ProviderCard key={item.prestador.id} provider={item}
                    onPress={() => navigation.navigate('PrestadorProfile', { prestadorId: item.prestador.id })} />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.colors.background, flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    alignSelf: 'center', flexGrow: 1, gap: 14, maxWidth: 560, paddingBottom: 110,
    paddingHorizontal: 20, width: '100%',
  },
  intro: { gap: 2, marginTop: 2 },
  title: { color: customerTheme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  description: { color: customerTheme.colors.textSecondary, fontSize: 13 },
  searchField: {
    alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.input,
    flexDirection: 'row', gap: 10, height: 48, paddingHorizontal: 16,
  },
  searchInput: { color: customerTheme.colors.text, flex: 1, fontSize: 13, height: 48 },
  exploreSection: { gap: 14 },
  sectionTitle: { color: customerTheme.colors.text, fontSize: 18, fontWeight: '800' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryTile: { borderRadius: customerTheme.radius.image, height: 118, overflow: 'hidden', width: '48.4%' },
  categoryImage: { height: '100%', width: '100%' },
  categoryOverlay: { backgroundColor: 'rgba(20,8,31,0.68)', bottom: 0, height: 40, left: 0, position: 'absolute', right: 0 },
  categoryName: { bottom: 12, color: customerTheme.colors.textOnBrand, fontSize: 14, fontWeight: '600', left: 12, position: 'absolute', right: 12 },
  filtersScroll: { flexGrow: 0, height: 36 },
  filters: { alignItems: 'center', gap: 8, height: 36 },
  filterChip: { backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.pill, height: 36, paddingHorizontal: 14, justifyContent: 'center', alignSelf: 'flex-start' },
  filterChipActive: { backgroundColor: customerTheme.colors.brandDark },
  filterText: { color: customerTheme.colors.text, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: customerTheme.colors.textOnBrand },
  results: { gap: 12 },
  message: { color: customerTheme.colors.textSecondary, fontSize: 13 },
  pressed: { opacity: 0.84 },
});
