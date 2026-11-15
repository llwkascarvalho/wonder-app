import { StyleSheet, View } from 'react-native';

import { customerTheme } from '../../styles/customerTheme';

export function CustomerHomeSkeleton() {
  return (
    <View accessibilityLabel="Carregando conteúdo" style={styles.container}>
      <View style={[styles.skeleton, styles.label]} />
      <View style={styles.categories}>
        {Array.from({ length: 4 }, (_, index) => <View key={index} style={[styles.skeleton, styles.category]} />)}
      </View>
      <View style={[styles.skeleton, styles.shortLabel]} />
      {Array.from({ length: 3 }, (_, index) => <View key={index} style={[styles.skeleton, styles.card]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  skeleton: { backgroundColor: customerTheme.colors.skeleton },
  label: { borderRadius: 10, height: 24, width: 110 },
  shortLabel: { borderRadius: 10, height: 24, width: 90 },
  categories: { flexDirection: 'row', gap: 10 },
  category: { borderRadius: 20, height: 96, width: 72 },
  card: { borderRadius: customerTheme.radius.card, height: 86, width: '100%' },
});
