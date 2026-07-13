import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { theme } from '../../styles/theme';
import { ProviderCategoryLink, ProviderOnboardingCategory } from '../../types/providerOnboarding';

type ProviderCategoriesStepProps = {
  categories: ProviderOnboardingCategory[];
  selectedCategories: ProviderCategoryLink[];
  disabled: boolean;
  savingCategoryId: number | null;
  onAdd: (categoriaId: number) => Promise<void>;
  onRemove: (categoriaId: number) => Promise<void>;
};

export function ProviderCategoriesStep({
  categories,
  selectedCategories,
  disabled,
  savingCategoryId,
  onAdd,
  onRemove,
}: ProviderCategoriesStepProps) {
  const selectedIds = new Set(selectedCategories.map((link) => link.categoria.id));

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Categorias do estabelecimento</Text>
        <Text style={styles.text}>Selecione as areas de atuacao do seu estabelecimento.</Text>

        {categories.length ? (
          <View style={styles.list}>
            {categories.map((categoria) => {
              const selected = selectedIds.has(categoria.id);
              return (
                <View key={categoria.id} style={[styles.row, selected && styles.rowSelected]}>
                  <View style={styles.info}>
                    <Text style={styles.itemTitle}>{categoria.nome}</Text>
                    {categoria.descricao ? <Text style={styles.text}>{categoria.descricao}</Text> : null}
                  </View>
                  <Button
                    title={selected ? 'Remover' : 'Adicionar'}
                    size="sm"
                    variant={selected ? 'outline' : 'primary'}
                    disabled={disabled || savingCategoryId !== null}
                    loading={savingCategoryId === categoria.id}
                    onPress={() => (selected ? onRemove(categoria.id) : onAdd(categoria.id))}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.text}>Nenhuma categoria ativa disponivel.</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  list: {
    gap: theme.spacing.sm,
  },
  row: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  rowSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
