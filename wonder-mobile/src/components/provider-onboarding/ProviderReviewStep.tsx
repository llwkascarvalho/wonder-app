import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { theme } from '../../styles/theme';
import {
  ProviderCategoryLink,
  ProviderOnboardingCategory,
  ProviderOnboardingProfile,
  ProviderOnboardingSchedule,
  ProviderOnboardingService,
} from '../../types/providerOnboarding';

type ProviderReviewStepProps = {
  profile: ProviderOnboardingProfile | null;
  selectedCategories: ProviderCategoryLink[];
  serviceCategories: ProviderOnboardingCategory[];
  services: ProviderOnboardingService[];
  schedules: ProviderOnboardingSchedule[];
  saving: boolean;
  validationErrors: string[];
  onSubmit: () => Promise<void>;
};

export function ProviderReviewStep({
  profile,
  selectedCategories,
  serviceCategories,
  services,
  schedules,
  saving,
  validationErrors,
  onSubmit,
}: ProviderReviewStepProps) {
  const categoriesById = serviceCategories.reduce<Record<number, ProviderOnboardingCategory>>((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Revisao</Text>

      <SummaryBlock title="Estabelecimento">
        <Text style={styles.text}>{profile?.nome_estab || '-'}</Text>
        <Text style={styles.text}>{profile?.documento || '-'}</Text>
      </SummaryBlock>

      <SummaryBlock title="Categorias do estabelecimento">
        {selectedCategories.length ? (
          selectedCategories.map((link) => (
            <Text key={link.categoria.id} style={styles.text}>
              {link.categoria.nome}
            </Text>
          ))
        ) : (
          <Text style={styles.text}>Nenhuma categoria associada.</Text>
        )}
      </SummaryBlock>

      <SummaryBlock title="Servicos">
        {services.length ? (
          services.map((service) => (
            <Text key={service.id} style={styles.text}>
              {service.nome} - {service.categoria_id ? categoriesById[service.categoria_id]?.nome || service.categoria_id : 'sem categoria'}
            </Text>
          ))
        ) : (
          <Text style={styles.text}>Nenhum servico cadastrado.</Text>
        )}
      </SummaryBlock>

      <SummaryBlock title="Horarios">
        {schedules.length ? (
          schedules.map((schedule) => (
            <Text key={schedule.id} style={styles.text}>
              Dia {schedule.dia_semana}: {schedule.hora_inicio} - {schedule.hora_fim}
            </Text>
          ))
        ) : (
          <Text style={styles.text}>Nenhum horario cadastrado.</Text>
        )}
      </SummaryBlock>

      {validationErrors.length ? (
        <View style={styles.errorBox}>
          {validationErrors.map((error) => (
            <Text key={error} style={styles.error}>
              {error}
            </Text>
          ))}
        </View>
      ) : null}

      <Button
        title="Enviar para aprovacao"
        loading={saving}
        disabled={validationErrors.length > 0 || saving}
        onPress={onSubmit}
      />
    </Card>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  block: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  blockTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  errorBox: {
    gap: theme.spacing.xs,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
