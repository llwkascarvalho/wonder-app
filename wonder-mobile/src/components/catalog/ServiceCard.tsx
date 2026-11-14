import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Card } from '../Card';
import { customerTheme } from '../../styles/customerTheme';
import { theme } from '../../styles/theme';
import { Servico } from '../../types/catalogo';
import { CatalogImage } from './CatalogImage';

type ServiceCardProps = {
  servico: Servico;
  onPress?: () => void;
  selected?: boolean;
  variant?: 'default' | 'booking';
  style?: StyleProp<ViewStyle>;
};

export function ServiceCard({ servico, onPress, selected = false, variant = 'default', style }: ServiceCardProps) {
  const booking = variant === 'booking';
  return (
    <Card onPress={onPress} style={[
      styles.card, booking && styles.bookingCard, !booking && selected && styles.selected, style,
    ]}>
      <CatalogImage fotoUrl={servico.foto_url} kind="service" style={[styles.image, booking && styles.bookingImage]} />
      <View style={styles.content}>
        <Text style={[styles.title, !booking && selected && styles.selectedText]} numberOfLines={2}>
          {servico.nome}
        </Text>
        {booking ? (
          <>
            <Text style={styles.meta}>{servico.duracao_min} min</Text>
            <Text style={styles.bookingPrice}>{new Intl.NumberFormat('pt-BR', {
              style: 'currency', currency: 'BRL',
            }).format(servico.preco)}</Text>
          </>
        ) : (
          <Text style={[styles.meta, selected && styles.selectedText]}>
            R$ {servico.preco.toFixed(2)} - {servico.duracao_min} min
          </Text>
        )}
      </View>
      {booking ? (
        <View style={[styles.selection, selected && styles.selectionActive]}>
          <Text style={[styles.selectionText, selected && styles.selectionTextActive]}>{selected ? '✓' : '+'}</Text>
        </View>
      ) : null}
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
  bookingCard: {
    borderRadius: customerTheme.radius.card,
    borderWidth: 0,
    minHeight: 92,
    padding: 12,
    ...customerTheme.shadow,
  },
  bookingImage: {
    borderRadius: 18,
    height: 64,
    width: 64,
  },
  bookingPrice: {
    color: customerTheme.colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  selection: {
    alignItems: 'center',
    backgroundColor: '#EFE7DA',
    borderRadius: customerTheme.radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  selectionActive: {
    backgroundColor: customerTheme.colors.brandDark,
  },
  selectionText: {
    color: customerTheme.colors.brand,
    fontSize: 20,
    fontWeight: '600',
  },
  selectionTextActive: {
    color: customerTheme.colors.textOnBrand,
  },
});
