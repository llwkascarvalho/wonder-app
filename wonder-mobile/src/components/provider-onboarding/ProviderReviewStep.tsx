import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { theme } from '../../styles/theme';
import {
  ProviderOnboardingCategory,
  ProviderOnboardingSchedule,
  ProviderOnboardingService,
  ProviderRegistrationDraft,
} from '../../types/providerOnboarding';
import { ProfilePhotoAsset } from '../../types/profile';
import { registrationFields } from '../../utils/providerRegistration';
import { CatalogImage } from '../catalog/CatalogImage';

type ProviderReviewStepProps = {
  values: ProviderRegistrationDraft;
  photo?: ProfilePhotoAsset;
  saving: boolean;
  validationErrors: string[];
  onSubmit: () => Promise<void>;
  submitTitle?: string;
  existingPhotoUrl?: string | null;
  categories: ProviderOnboardingCategory[];
  services: ProviderOnboardingService[];
  schedules: ProviderOnboardingSchedule[];
};

const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function ProviderReviewStep({
  values, photo, saving, validationErrors, onSubmit, submitTitle = 'Enviar cadastro', existingPhotoUrl,
  categories, services, schedules,
}: ProviderReviewStepProps) {
  const categoriesById = new Map(categories.map((category) => [category.id, category.nome]));

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Revisão do cadastro</Text>
      {(Object.keys(registrationFields) as Array<keyof ProviderRegistrationDraft>).map((key) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{registrationFields[key].label}</Text>
          <Text style={styles.text}>{values[key].trim() || 'Não informado'}</Text>
        </View>
      ))}
      <Text style={styles.label}>Foto do estabelecimento</Text>
      {photo ? (
        <Image source={{ uri: photo.uri }} accessibilityLabel="Foto selecionada do estabelecimento" style={styles.photo} />
      ) : existingPhotoUrl ? <CatalogImage authenticated fotoUrl={existingPhotoUrl} kind="provider" style={styles.photo} />
        : <Text style={styles.text}>Não informada</Text>}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serviços</Text>
        {services.map((service) => (
          <View key={service.id} style={styles.resourceItem}>
            <CatalogImage authenticated fotoUrl={service.foto_url} kind="service" style={styles.servicePhoto} />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>{service.nome}</Text>
              <Text style={styles.text}>R$ {Number(service.preco).toFixed(2)} · {service.duracao_min} min</Text>
              <Text style={styles.text}>Categoria: {service.categoria_id ? categoriesById.get(service.categoria_id) || 'Categoria ativa' : 'Não informada'}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horários de atendimento</Text>
        {schedules.map((schedule) => (
          <View key={schedule.id} style={styles.scheduleItem}>
            <Text style={styles.resourceTitle}>{dayLabels[schedule.dia_semana] || 'Dia'}</Text>
            <Text style={styles.text}>{schedule.hora_inicio} - {schedule.hora_fim}</Text>
          </View>
        ))}
      </View>
      {validationErrors.map((error) => <Text key={error} style={styles.error}>{error}</Text>)}
      <Button title={submitTitle} loading={saving} disabled={saving || validationErrors.length > 0} onPress={onSubmit} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  field: { gap: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  label: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold },
  text: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  error: { color: theme.colors.error, fontSize: theme.fontSize.sm },
  photo: { width: 120, height: 120, borderRadius: theme.borderRadius.md, alignSelf: 'center' },
  section: { gap: theme.spacing.sm },
  sectionTitle: { color: theme.colors.primary, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  resourceItem: { alignItems: 'center', backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.sm, flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.sm },
  resourceInfo: { flex: 1, gap: theme.spacing.xs },
  resourceTitle: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold },
  servicePhoto: { borderRadius: theme.borderRadius.sm, height: 64, width: 64 },
  scheduleItem: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.borderRadius.sm, gap: theme.spacing.xs, padding: theme.spacing.sm },
});
