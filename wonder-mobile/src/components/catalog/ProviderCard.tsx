import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../Card';
import { theme } from '../../styles/theme';
import { ProviderCardModel } from '../../utils/catalogPresentation';
import { CatalogImage } from './CatalogImage';

type ProviderCardProps = {
  provider: ProviderCardModel;
  onPress: () => void;
};

export function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const categoriasTexto =
    provider.categorias.length > 0
      ? provider.categorias.map((categoria) => categoria.nome).join(', ')
      : 'Categorias nao informadas';
  const avaliacaoTexto =
    provider.mediaAvaliacao === null ? 'Sem avaliações' : `${provider.mediaAvaliacao.toFixed(1)} de 5`;

  return (
    <Card onPress={onPress} style={styles.card}>
      <CatalogImage
        fotoUrl={provider.prestador.foto_url}
        kind="provider"
        style={styles.image}
      />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {provider.prestador.nome_estab}
        </Text>
        <Text style={styles.categories} numberOfLines={1}>
          {categoriasTexto}
        </Text>
        <Text style={styles.rating}>{avaliacaoTexto}</Text>
      </View>

      <Text style={[styles.status, provider.disponivelHoje ? styles.available : styles.closed]}>
        {provider.disponivelHoje ? 'Disponível hoje' : 'Fechado'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 86,
  },
  image: {
    borderRadius: theme.borderRadius.md,
    height: 62,
    width: 62,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  categories: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
  rating: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  status: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'right',
  },
  available: {
    color: theme.colors.success,
  },
  closed: {
    color: theme.colors.error,
  },
});
