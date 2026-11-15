import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { customerTheme } from '../../styles/customerTheme';
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

  const localidade = [provider.prestador.cidade, provider.prestador.estado].filter(Boolean).join('/') || 'Local não informado';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
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
          {categoriasTexto} · {localidade}
        </Text>
        <Text style={[styles.status, provider.atendeHoje ? styles.available : styles.unknown]}>
          {provider.atendeHoje === null
            ? 'Horários indisponíveis'
            : provider.atendeHoje ? 'Disponível hoje' : 'Sem mais atendimento hoje'}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={26} color={customerTheme.colors.brandDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: customerTheme.colors.surface,
    borderRadius: customerTheme.radius.card,
    flexDirection: 'row',
    gap: 12,
    height: 86,
    padding: 12,
    ...customerTheme.shadow,
  },
  image: {
    borderRadius: 18,
    height: 58,
    width: 58,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: customerTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  categories: {
    color: customerTheme.colors.textSecondary,
    fontSize: 12,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
  },
  available: {
    color: customerTheme.colors.brand,
  },
  unknown: {
    color: customerTheme.colors.textSecondary,
  },
  pressed: { opacity: 0.84 },
});
