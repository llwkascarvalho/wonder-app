import { Image, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '../Button';
import { customerTheme } from '../../styles/customerTheme';
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
  onSubmit?: () => void | Promise<void>;
  submitTitle?: string;
  readOnly?: boolean;
  existingPhotoUrl?: string | null;
  categories: ProviderOnboardingCategory[];
  services: ProviderOnboardingService[];
  schedules: ProviderOnboardingSchedule[];
};

const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function ProviderReviewStep({
  values, photo, saving, validationErrors, onSubmit, submitTitle = 'Enviar cadastro', existingPhotoUrl,
  categories, services, schedules, readOnly = false,
}: ProviderReviewStepProps) {
  const categoriesById = new Map(categories.map((category) => [category.id, category.nome]));

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBox}><MaterialIcons name="fact-check" size={26} color={customerTheme.v4.primary} /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Revisão do cadastro</Text>
          <Text style={styles.text}>{readOnly
            ? 'Confira as informações enviadas para análise.'
            : 'Confira os dados antes de enviar para análise.'}</Text>
        </View>
      </View>
      <View style={styles.detailsCard}>
      {(Object.keys(registrationFields) as Array<keyof ProviderRegistrationDraft>).map((key) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{registrationFields[key].label}</Text>
          <Text style={styles.text}>{values[key].trim() || 'Não informado'}</Text>
        </View>
      ))}
      </View>
      <Text style={styles.label}>Foto do estabelecimento</Text>
      {photo ? (
        <Image source={{ uri: photo.uri }} accessibilityLabel="Foto selecionada do estabelecimento" style={styles.photo} />
      ) : existingPhotoUrl ? <CatalogImage authenticated fotoUrl={existingPhotoUrl} kind="provider" style={styles.photo} />
        : <Text style={styles.text}>Não informada</Text>}
      <View style={styles.sectionCard}>
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
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Horários de atendimento</Text>
        {schedules.map((schedule) => (
          <View key={schedule.id} style={styles.scheduleItem}>
            <Text style={styles.resourceTitle}>{dayLabels[schedule.dia_semana] || 'Dia'}</Text>
            <Text style={styles.text}>{schedule.hora_inicio} - {schedule.hora_fim}</Text>
          </View>
        ))}
      </View>
      {!readOnly && validationErrors.length ? (
        <View style={styles.validationCard}>
          <MaterialIcons name="error-outline" size={18} color="#9A6700" />
          <View style={styles.validationText}>{validationErrors.map((error) => <Text key={error} style={styles.error}>{error}</Text>)}</View>
        </View>
      ) : null}
      {!readOnly && onSubmit ? <Button appearance="customer" title={submitTitle} loading={saving}
        disabled={saving || validationErrors.length > 0} onPress={onSubmit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    gap: 18, padding: 20, ...customerTheme.shadow,
  },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  headingText: { flex: 1, gap: 3 },
  iconBox: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  field: { gap: 3, paddingVertical: 4 },
  detailsCard: { backgroundColor: customerTheme.v4.bg, borderRadius: 18, gap: 8, padding: 14 },
  title: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 20, lineHeight: 24 },
  label: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 15 },
  text: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15, lineHeight: 21 },
  error: { color: '#9A6700', fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 20 },
  photo: { alignSelf: 'center', borderRadius: 18, height: 128, width: 128 },
  sectionCard: { backgroundColor: customerTheme.v4.bg, borderRadius: 18, gap: 10, padding: 14 },
  sectionTitle: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontDisplay, fontSize: 18 },
  resourceItem: { alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: 16, flexDirection: 'row', gap: 10, padding: 10 },
  resourceInfo: { flex: 1, gap: 3 },
  resourceTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 16 },
  servicePhoto: { borderRadius: 12, height: 58, width: 58 },
  scheduleItem: { backgroundColor: customerTheme.colors.surface, borderRadius: 16, gap: 3, padding: 12 },
  validationCard: { alignItems: 'flex-start', backgroundColor: '#FFF0C7', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 12 },
  validationText: { flex: 1, gap: 3 },
});
