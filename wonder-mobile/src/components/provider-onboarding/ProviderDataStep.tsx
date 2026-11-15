import { MaterialIcons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { Input } from '../Input';
import { customerTheme } from '../../styles/customerTheme';
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
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBox}><MaterialIcons name="storefront" size={20} color={customerTheme.colors.brandDark} /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Dados do estabelecimento</Text>
          <Text style={styles.text}>Informe como seu negócio será apresentado no Wonder.</Text>
        </View>
      </View>
      {(['nomeEstab', 'documento'] as const).map((key) => (
        <Input
          key={key}
          label={`${registrationFields[key].label}${registrationFields[key].required ? ' *' : ''}`}
          value={values[key]}
          maxLength={registrationFields[key].maxLength}
          editable={!disabled}
          error={errors[key]}
          appearance="customer"
          onChangeText={(value) => onChange({ [key]: value })}
        />
      ))}
      <View style={styles.photoSection}>
        {photo ? <Image source={{ uri: photo.uri }} accessibilityLabel="Nova foto selecionada do estabelecimento" style={styles.photo} />
          : existingPhotoUrl ? <CatalogImage authenticated fotoUrl={existingPhotoUrl} kind="provider" style={styles.photo} />
            : <View style={styles.photoPlaceholder}><MaterialIcons name="add-photo-alternate" size={30} color={customerTheme.colors.brand} /></View>}
        <View style={styles.photoContent}>
          <Text style={styles.photoTitle}>Foto do estabelecimento</Text>
          <Text style={styles.text}>{photo ? photo.fileName || 'Nova foto selecionada' : existingPhotoUrl ? 'Foto atual mantida.' : 'Opcional · JPEG, PNG ou WebP de até 5 MiB.'}</Text>
          <Button title={photo || existingPhotoUrl ? 'Trocar foto' : 'Selecionar foto'} size="sm" variant="secondary" loading={picking} disabled={disabled} onPress={onSelectPhoto} />
          {photo ? <Button title="Descartar nova foto" size="sm" variant="outline" disabled={disabled} onPress={onRemovePhoto} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    gap: 16, padding: 18, ...customerTheme.shadow,
  },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  headingText: { flex: 1, gap: 3 },
  iconBox: {
    alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 14,
    height: 44, justifyContent: 'center', width: 44,
  },
  title: { color: customerTheme.colors.text, fontSize: 18, fontWeight: '800' },
  text: { color: customerTheme.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  photoSection: {
    alignItems: 'center', backgroundColor: '#F4F1F8', borderRadius: 18,
    flexDirection: 'row', gap: 14, padding: 12,
  },
  photo: { borderRadius: 16, height: 96, width: 96 },
  photoPlaceholder: {
    alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 16,
    height: 96, justifyContent: 'center', width: 96,
  },
  photoContent: { flex: 1, gap: 8, minWidth: 0 },
  photoTitle: { color: customerTheme.colors.text, fontSize: 13, fontWeight: '700' },
});
