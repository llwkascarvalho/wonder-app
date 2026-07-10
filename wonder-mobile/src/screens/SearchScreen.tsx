import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import { listarCategorias, listarPrestadores } from '../services/catalogo';
import { theme } from '../styles/theme';
import { Categoria, Prestador } from '../types/catalogo';

type SearchScreenNavigationProp = NativeStackNavigationProp<SearchStackParamList, 'SearchHome'>;

export function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();

  const [nome, setNome] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
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
      setPrestadores(resultado);
    } catch {
      setErro('Não foi possível carregar os prestadores. Tente novamente.');
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
      <Text style={styles.subtitle}>Encontre profissionais de beleza perto de você</Text>

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
          contentContainerStyle={styles.categoriasList}
          renderItem={({ item }) => {
            const selecionada =
              (item.id === -1 && categoriaSelecionada === null) ||
              item.id === categoriaSelecionada;

            return (
              <Card
                onPress={() => setCategoriaSelecionada(item.id === -1 ? null : item.id)}
                style={[styles.categoriaChip, selecionada && styles.categoriaChipAtiva]}
              >
                <Text
                  style={[styles.categoriaChipText, selecionada && styles.categoriaChipTextAtiva]}
                >
                  {item.nome}
                </Text>
              </Card>
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
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.resultadosList}
          ListEmptyComponent={
            <Card>
              <Text style={styles.cardText}>Nenhum prestador encontrado.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => navigation.navigate('PrestadorProfile', { prestadorId: item.id })}
              style={styles.resultCard}
            >
              <Text style={styles.cardTitle}>{item.nome_estab}</Text>
              <Text style={styles.cardText}>
                {item.status === 'ativo' ? 'Disponível' : item.status}
              </Text>
            </Card>
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
  },
  categoriaChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
  resultadosList: {
    gap: theme.spacing.sm,
  },
  resultCard: {
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
});
