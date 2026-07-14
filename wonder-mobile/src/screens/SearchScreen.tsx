import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { ProviderCard } from '../components/catalog/ProviderCard';
import { Input } from '../components/Input';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import { listarCategorias, listarPrestadores } from '../services/catalogo';
import { theme } from '../styles/theme';
import { Categoria } from '../types/catalogo';
import { carregarCardsPrestadores, ProviderCardModel } from '../utils/catalogPresentation';

type SearchScreenNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'SearchHome'>;

export function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();

  const [nome, setNome] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<ProviderCardModel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const buscarPrestadores = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const resultado = await listarPrestadores({
        nome: nome.trim() || undefined,
        categoria_id: categoriaSelecionada ?? undefined,
      });
      const cards = await carregarCardsPrestadores(resultado);
      setPrestadores(cards);
    } catch {
      setErro('Nao foi possivel carregar os prestadores. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [nome, categoriaSelecionada]);

  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(buscarPrestadores, 350);
    return () => clearTimeout(timeout);
  }, [buscarPrestadores]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Encontre profissionais de beleza perto de voce</Text>

      <Input
        label="Buscar por nome"
        placeholder="Ex.: Diego BarberShop"
        value={nome}
        onChangeText={setNome}
      />

      {categorias.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: -1, nome: 'Todas' }, ...categorias]}
          keyExtractor={(item) => String(item.id)}
          style={styles.categoriasScroller}
          contentContainerStyle={styles.categoriasList}
          renderItem={({ item }) => {
            const selecionada =
              (item.id === -1 && categoriaSelecionada === null) ||
              item.id === categoriaSelecionada;

            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCategoriaSelecionada(item.id === -1 ? null : item.id)}
                style={({ pressed }) => [
                  styles.categoriaChip,
                  selecionada && styles.categoriaChipAtiva,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.categoriaChipText, selecionada && styles.categoriaChipTextAtiva]}
                  numberOfLines={1}
                >
                  {item.nome}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}

      {carregando ? (
        <LoadingIndicator text="Buscando prestadores..." />
      ) : erro ? (
        <Card>
          <Text style={styles.cardText}>{erro}</Text>
        </Card>
      ) : (
        <FlatList
          data={prestadores}
          keyExtractor={(item) => String(item.prestador.id)}
          contentContainerStyle={styles.resultadosList}
          ListEmptyComponent={
            <Card>
              <Text style={styles.cardText}>Nenhum prestador encontrado.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <ProviderCard
              provider={item}
              onPress={() =>
                navigation.navigate('PrestadorProfile', { prestadorId: item.prestador.id })
              }
            />
          )}
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
  categoriasList: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  categoriasScroller: {
    flexGrow: 0,
    maxHeight: 42,
  },
  categoriaChip: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    maxWidth: 150,
    minWidth: 72,
    paddingHorizontal: theme.spacing.md,
  },
  categoriaChipAtiva: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoriaChipText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  categoriaChipTextAtiva: {
    color: theme.colors.white,
  },
  pressed: {
    opacity: 0.86,
  },
  resultadosList: {
    gap: theme.spacing.sm,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
