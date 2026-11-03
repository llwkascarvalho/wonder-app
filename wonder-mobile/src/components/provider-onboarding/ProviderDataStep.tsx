import { Image, StyleSheet, Text } from 'react-native';

import { Card } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { theme } from '../../styles/theme';
import { ProviderRegistrationDraft } from '../../types/providerOnboarding';
import { ProfilePhotoAsset } from '../../types/profile';
import { registrationFields } from '../../utils/providerRegistration';
import { CatalogImage } from '../catalog/CatalogImage';

export type ProviderRegistrationFieldsProps = {
  values: ProviderRegistrationDraft;
  onChange: (changes: Partial<ProviderRegistrationDraft>) => void;
  errors: Partial<Record<keyof ProviderRegistrationDraft, string>>;
  disabled: boolean;
};

type ProviderDataStepProps = ProviderRegistrationFieldsProps & {
  photo?: ProfilePhotoAsset;
  picking: boolean;
  onSelectPhoto: () => Promise<void>;
  onRemovePhoto: () => void;
  existingPhotoUrl?: string | null;
};

export function ProviderDataStep({ values, onChange, errors, disabled, photo, picking, onSelectPhoto, onRemovePhoto, existingPhotoUrl }: ProviderDataStepProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Dados do estabelecimento</Text>
      {(['nomeEstab', 'documento'] as const).map((key) => (
        <Input
          key={key}
          label={`${registrationFields[key].label}${registrationFields[key].required ? ' *' : ''}`}
          value={values[key]}
          maxLength={registrationFields[key].maxLength}
          editable={!disabled}
          error={errors[key]}
          onChangeText={(value) => onChange({ [key]: value })}
        />
      ))}
      <Text style={styles.text}>Foto do estabelecimento (opcional)</Text>
      {photo ? <Image source={{ uri: photo.uri }} accessibilityLabel="Nova foto selecionada do estabelecimento" style={styles.photo} />
        : existingPhotoUrl ? <CatalogImage authenticated fotoUrl={existingPhotoUrl} kind="provider" style={styles.photo} /> : null}
      <Button title={photo || existingPhotoUrl ? 'Trocar foto' : 'Selecionar foto'} variant="secondary" loading={picking} disabled={disabled} onPress={onSelectPhoto} />
      <Text style={styles.text}>{photo ? photo.fileName || 'Nova foto selecionada' : existingPhotoUrl ? 'Foto atual mantida.' : 'JPEG, PNG ou WebP de até 5 MiB.'}</Text>
      {photo ? <Button title="Descartar nova foto" variant="outline" disabled={disabled} onPress={onRemovePhoto} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  text: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
  photo: { width: 120, height: 120, borderRadius: theme.borderRadius.md, alignSelf: 'center' },
});
