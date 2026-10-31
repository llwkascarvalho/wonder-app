import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { theme } from '../../styles/theme';
import { ProviderRegistrationDraft } from '../../types/providerOnboarding';
import { ProfilePhotoAsset } from '../../types/profile';
import { registrationFields } from '../../utils/providerRegistration';

type ProviderReviewStepProps = {
  values: ProviderRegistrationDraft;
  photo?: ProfilePhotoAsset;
  saving: boolean;
  validationErrors: string[];
  onSubmit: () => Promise<void>;
};

export function ProviderReviewStep({ values, photo, saving, validationErrors, onSubmit }: ProviderReviewStepProps) {
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
      ) : <Text style={styles.text}>Não informada</Text>}
      {validationErrors.map((error) => <Text key={error} style={styles.error}>{error}</Text>)}
      <Button title="Enviar cadastro" loading={saving} disabled={saving || validationErrors.length > 0} onPress={onSubmit} />
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
});
