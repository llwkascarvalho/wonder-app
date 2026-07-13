import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { ProviderServiceModal } from '../ProviderServiceModal';
import { theme } from '../../styles/theme';
import { ProviderOnboardingCategory, ProviderOnboardingService } from '../../types/providerOnboarding';

type ProviderServicesStepProps = {
  categories: ProviderOnboardingCategory[];
  services: ProviderOnboardingService[];
  modalVisible: boolean;
  saving: boolean;
  disabled: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onCreateService: (payload: {
    nome: string;
    preco: number;
    duracao_min: number;
    categoria_id?: number;
  }) => Promise<void>;
};

export function ProviderServicesStep({
  categories,
  services,
  modalVisible,
  saving,
  disabled,
  onOpenModal,
  onCloseModal,
  onCreateService,
}: ProviderServicesStepProps) {
  const categoriesById = categories.reduce<Record<number, ProviderOnboardingCategory>>((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Servicos</Text>
          <Text style={styles.text}>Cadastre servicos e selecione a categoria individual de cada servico.</Text>
        </View>
        <Button title="Cadastrar" size="sm" disabled={disabled || !categories.length} onPress={onOpenModal} />
      </View>

      {services.length ? (
        <View style={styles.list}>
          {services.map((service) => (
            <View key={service.id} style={styles.item}>
              <Text style={styles.itemTitle}>{service.nome}</Text>
              <Text style={styles.text}>
                R$ {service.preco.toFixed(2)} - {service.duracao_min} min
              </Text>
              <Text style={service.categoria_id ? styles.categoryOk : styles.categoryMissing}>
                Categoria: {service.categoria_id ? categoriesById[service.categoria_id]?.nome || service.categoria_id : 'nao informada'}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.text}>Nenhum servico cadastrado.</Text>
      )}

      {!categories.length ? <Text style={styles.warning}>Cadastre uma categoria ativa antes de adicionar servicos.</Text> : null}

      <ProviderServiceModal
        visible={modalVisible}
        loading={saving}
        categories={categories}
        onClose={onCloseModal}
        onSave={onCreateService}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
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
  warning: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  list: {
    gap: theme.spacing.sm,
  },
  item: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  categoryOk: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  categoryMissing: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
});
