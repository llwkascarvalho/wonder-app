import { Pressable, StyleSheet, Text, View } from 'react-native';

import { customerTheme } from '../../styles/customerTheme';
import { Categoria } from '../../types/catalogo';
import { CatalogImage } from './CatalogImage';

type CategoryCardProps = {
  categoria: Categoria;
  selected?: boolean;
  onPress: () => void;
};

export function CategoryCard({ categoria, selected = false, onPress }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.imageFrame, selected && styles.selected]}>
        <CatalogImage fotoUrl={categoria.foto_url} kind="category" style={styles.image} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {categoria.nome}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  pressed: {
    opacity: 0.86,
  },
  imageFrame: {
    borderRadius: customerTheme.radius.image,
    height: 72,
    overflow: 'hidden',
    width: 72,
  },
  selected: {
    borderColor: customerTheme.colors.brand,
    borderWidth: 2,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  name: {
    color: customerTheme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
});
