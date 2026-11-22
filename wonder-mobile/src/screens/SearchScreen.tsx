import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { HeroGlows } from '../components/customer/HeroGlows';
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
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const tablet = width >= 640;
  const mobileCategoryWidth = Math.min(136, (width - 52) / 2);
  const [nome, setNome] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<ProviderCardModel[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const mostrandoResultados = Boolean(nome.trim() || categoriaSelecionada || mostrarTodos);
  const categoriaAtual = categorias.find((item) => item.id === categoriaSelecionada);

  function limparFiltros() {
    setNome('');
    setCategoriaSelecionada(null);
    setMostrarTodos(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

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
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { paddingTop: desktop ? 44 : Math.max(insets.top, 56), paddingHorizontal: desktop ? 76 : tablet ? 32 : 20 }]}>
        <HeroGlows desktop={desktop} />
        <View style={styles.intro}>
          <Text style={styles.title}>{categoriaAtual?.nome || (mostrandoResultados ? 'Resultados' : 'Buscar')}</Text>
          <Text style={styles.description}>{mostrandoResultados
            ? `${prestadores.length} ${prestadores.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}.`
            : 'Encontre serviços e estabelecimentos.'}</Text>
        </View>

        <View style={styles.searchField}>
          <MaterialIcons name="search" size={22} color={customerTheme.v4.primary} />
          <TextInput
            accessibilityLabel="Buscar por nome ou serviço"
            placeholder="Buscar por nome ou serviço"
            placeholderTextColor={customerTheme.v4.textMuted}
            value={nome}
            onChangeText={setNome}
            style={styles.searchInput}
          />
        </View>
      </View>
      <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
      <View style={[styles.container, { paddingHorizontal: desktop ? 76 : tablet ? 32 : 20 }]}>

        {!mostrandoResultados ? (
          <View style={styles.exploreSection}>
            <Text style={styles.sectionTitle}>Sugestões</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
              {categorias.slice(0, 4).map((categoria) => <FilterChip key={categoria.id} active={false} label={categoria.nome}
                onPress={() => setCategoriaSelecionada(categoria.id)} />)}
            </ScrollView>
            <Text style={styles.sectionTitle}>Explore por categoria</Text>
            <View style={styles.categoryGrid}>
              {categorias.map((categoria) => (
                <Pressable
                  accessibilityRole="button"
                  key={categoria.id}
                  onPress={() => setCategoriaSelecionada(categoria.id)}
                  style={({ pressed }) => [styles.categoryTile, !tablet && { width: mobileCategoryWidth }, desktop && styles.categoryTileDesktop, pressed && styles.pressed]}
                >
                  <CatalogImage fotoUrl={categoria.foto_url} kind="category" style={styles.categoryImage} />
                  <View style={styles.categoryOverlay} />
                  <Text style={styles.categoryName} numberOfLines={1}>{categoria.nome}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.popularHeader}>
              <Text style={styles.sectionTitle}>Populares na região</Text>
              <Pressable accessibilityRole="button" onPress={() => setMostrarTodos(true)}>
                <Text style={styles.sectionLink}>Ver todos</Text>
              </Pressable>
            </View>
            {carregando ? <LoadingIndicator text="Buscando prestadores..." /> : erro ? (
              <Text style={styles.message}>{erro}</Text>
            ) : prestadores.length === 0 ? <Text style={styles.message}>Nenhum prestador disponível.</Text> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularCarousel}>
                {prestadores.map((item) => <Pressable key={item.prestador.id} accessibilityRole="button"
                  onPress={() => navigation.navigate('PrestadorProfile', { prestadorId: item.prestador.id })}
                  style={[styles.popularCard, tablet && styles.popularCardTablet]}>
                  <CatalogImage fotoUrl={item.prestador.foto_url} kind="provider" style={styles.popularCover} />
                  {item.avaliacao ? <View style={styles.ratingBadge}><MaterialIcons name="star" size={16} color={customerTheme.v4.star} /><Text style={styles.ratingText}>{item.avaliacao.media.toFixed(1).replace('.', ',')}</Text></View> : null}
                  <View style={styles.popularBody}>
                    <Text style={styles.popularName} numberOfLines={1}>{item.prestador.nome_estab}</Text>
                    <Text style={styles.popularMeta} numberOfLines={1}>{item.categorias.map((c) => c.nome).join(', ') || 'Serviços'}</Text>
                    <Text style={styles.popularMeta} numberOfLines={1}>{[item.prestador.cidade, item.prestador.estado].filter(Boolean).join('/') || 'Local não informado'}</Text>
                  </View>
                </Pressable>)}
              </ScrollView>
            )}
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filters}
            >
              <FilterChip active={categoriaSelecionada === null} label="Todos" onPress={limparFiltros} />
              {categoriaAtual ? (
                <FilterChip active label={categoriaAtual.nome} onPress={limparFiltros} />
              ) : null}
            </ScrollView>
            {carregando ? <LoadingIndicator text="Buscando prestadores..." /> : erro ? (
              <Card><Text style={styles.message}>{erro}</Text></Card>
            ) : prestadores.length === 0 ? (
              <Card><Text style={styles.message}>Nenhum prestador encontrado.</Text></Card>
            ) : (
              <View style={styles.results}>
                {prestadores.map((item, index) => (
                  <Pressable key={item.prestador.id} accessibilityRole="button"
                    onPress={() => navigation.navigate('PrestadorProfile', { prestadorId: item.prestador.id })}
                    style={[styles.resultRow, index < prestadores.length - 1 && styles.resultDivider]}>
                    <CatalogImage fotoUrl={item.prestador.foto_url} kind="provider" style={styles.resultImage} />
                    <View style={styles.resultBody}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.prestador.nome_estab}</Text>
                      <View style={styles.resultMetaRow}>
                        {item.avaliacao ? <View style={styles.resultRating}><MaterialIcons name="star" size={15} color={customerTheme.v4.star} /><Text style={styles.ratingText}>{item.avaliacao.media.toFixed(1).replace('.', ',')}</Text><Text style={styles.resultCount}>({item.avaliacao.quantidade}) · </Text></View> : null}
                        <Text style={styles.resultMeta} numberOfLines={1}>{item.categorias.map((c) => c.nome).join(', ') || 'Serviços'}</Text>
                      </View>
                      <Text style={[styles.resultAvailability, item.atendeHoje !== true && styles.resultUnavailable]}>{item.atendeHoje ? '● Disponível hoje' : item.atendeHoje === false ? 'Sem mais atendimento hoje' : 'Horários indisponíveis'}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={customerTheme.v4.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </View>
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
  screen: { backgroundColor: customerTheme.v4.bg, flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { backgroundColor: customerTheme.v4.primary, overflow: 'hidden', paddingBottom: 56 },
  sheet: { backgroundColor: customerTheme.v4.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, marginTop: -28, paddingTop: 24 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingTop: 40 },
  container: {
    alignSelf: 'center', flexGrow: 1, gap: 22, maxWidth: 1120, paddingBottom: 150, width: '100%',
  },
  intro: { gap: 6 },
  title: { color: '#FFF', fontFamily: customerTheme.v4.fontDisplay, fontSize: 34, lineHeight: 38 },
  description: { color: '#FFF', fontFamily: customerTheme.v4.fontBody, fontSize: 17 },
  searchField: {
    alignItems: 'center', backgroundColor: '#FFF', borderRadius: 28,
    flexDirection: 'row', gap: 12, height: 56, marginTop: 20, paddingHorizontal: 20, ...customerTheme.shadow,
  },
  searchInput: { color: customerTheme.v4.text, flex: 1, fontFamily: customerTheme.v4.fontBody, fontSize: 16, height: 56 },
  exploreSection: { gap: 12 },
  sectionTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 22 },
  sectionLink: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  suggestions: { gap: 10, paddingBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  categoryTile: { borderRadius: 20, height: 104, overflow: 'hidden', width: 136 },
  categoryTileDesktop: { height: 130, width: 180 },
  categoryImage: { height: '100%', width: '100%' },
  categoryOverlay: { backgroundColor: 'rgba(20,8,31,0.68)', bottom: 0, height: 40, left: 0, position: 'absolute', right: 0 },
  categoryName: { bottom: 12, color: '#FFF', fontFamily: customerTheme.v4.fontDisplay, fontSize: 20, left: 12, position: 'absolute', right: 12 },
  popularHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  popularCarousel: { gap: 14, paddingBottom: 18, paddingRight: 20 },
  popularCard: { backgroundColor: '#FFF', borderRadius: 22, overflow: 'hidden', width: 264, ...customerTheme.shadow },
  popularCardTablet: { width: 300 },
  popularCover: { height: 136, width: '100%' },
  ratingBadge: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', gap: 4, left: 12, paddingHorizontal: 9, paddingVertical: 5, position: 'absolute', top: 12 },
  ratingText: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 13 },
  popularBody: { gap: 4, padding: 14 },
  popularName: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 18 },
  popularMeta: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 14 },
  filtersScroll: { flexGrow: 0, height: 44 },
  filters: { alignItems: 'center', gap: 8, height: 44 },
  filterChip: { backgroundColor: '#FFF', borderColor: customerTheme.v4.border, borderWidth: 1, borderRadius: 22, height: 44, paddingHorizontal: 18, justifyContent: 'center', alignSelf: 'flex-start' },
  filterChipActive: { backgroundColor: customerTheme.v4.primary },
  filterText: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  filterTextActive: { color: customerTheme.colors.textOnBrand },
  results: { backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, ...customerTheme.shadow },
  resultRow: { alignItems: 'center', flexDirection: 'row', gap: 14, paddingVertical: 16 },
  resultDivider: { borderBottomColor: customerTheme.v4.border, borderBottomWidth: 1 },
  resultImage: { borderRadius: 18, height: 76, width: 76 },
  resultBody: { flex: 1, gap: 4, minWidth: 0 },
  resultName: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 18 },
  resultMetaRow: { alignItems: 'center', flexDirection: 'row', gap: 3 },
  resultRating: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  resultCount: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 13 },
  resultMeta: { color: customerTheme.v4.textMuted, flex: 1, fontFamily: customerTheme.v4.fontBody, fontSize: 14 },
  resultAvailability: { color: customerTheme.v4.success, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 14 },
  resultUnavailable: { color: customerTheme.v4.textMuted },
  message: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 16 },
  pressed: { opacity: 0.84 },
});
