import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../styles/theme';

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: number;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export function RatingStars({ value, onChange, disabled = false, size = 28 }: RatingStarsProps) {
  return (
    <View
      accessibilityLabel={`${value} de 5 estrelas`}
      accessibilityRole="text"
      style={styles.container}
    >
      {RATINGS.map((rating) => {
        const selected = rating <= Math.round(value);

        if (!onChange) {
          return (
            <Text key={rating} style={[styles.star, { fontSize: size, lineHeight: Math.ceil(size * 1.2) }, selected && styles.starSelected]}>
              {selected ? '★' : '☆'}
            </Text>
          );
        }

        return (
          <Pressable
            key={rating}
            accessibilityLabel={`Dar ${rating} ${rating === 1 ? 'estrela' : 'estrelas'}`}
            accessibilityRole="button"
            disabled={disabled}
            hitSlop={6}
            onPress={() => onChange(rating)}
            style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}
          >
            <Text style={[styles.star, { fontSize: size, lineHeight: Math.ceil(size * 1.2) }, selected && styles.starSelected]}>
              {selected ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  star: {
    color: theme.colors.textMuted,
  },
  starSelected: {
    color: theme.colors.warning,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.56,
  },
});
