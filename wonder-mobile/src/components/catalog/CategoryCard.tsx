import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../styles/theme';
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
    gap: theme.spacing.xs,
    width: 96,
  },
  pressed: {
    opacity: 0.86,
  },
  imageFrame: {
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    height: 96,
    overflow: 'hidden',
    width: 96,
  },
  selected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
    width: '100%',
  },
});
