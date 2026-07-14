import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Card } from '../Card';
import { theme } from '../../styles/theme';
import { Servico } from '../../types/catalogo';
import { CatalogImage } from './CatalogImage';

type ServiceCardProps = {
  servico: Servico;
  onPress?: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ServiceCard({ servico, onPress, selected = false, style }: ServiceCardProps) {
  return (
    <Card onPress={onPress} style={[styles.card, selected && styles.selected, style]}>
      <CatalogImage fotoUrl={servico.foto_url} kind="service" style={styles.image} />
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.selectedText]} numberOfLines={2}>
          {servico.nome}
        </Text>
        <Text style={[styles.meta, selected && styles.selectedText]}>
          R$ {servico.preco.toFixed(2)} - {servico.duracao_min} min
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  image: {
    borderRadius: theme.borderRadius.md,
    height: 78,
    width: 78,
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  selectedText: {
    color: theme.colors.white,
  },
});
