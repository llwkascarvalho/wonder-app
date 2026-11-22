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
        <View style={styles.iconBox}><MaterialIcons name="storefront" size={26} color={customerTheme.v4.primary} /></View>
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
          <Text style={styles.photoTitle}>Foto do estabelecimento (opcional)</Text>
          <Text style={styles.text}>{photo ? photo.fileName || 'Nova foto selecionada' : existingPhotoUrl ? 'Foto atual mantida.' : 'Opcional · JPEG, PNG ou WebP de até 5 MiB.'}</Text>
          <Button appearance="customer" title={photo || existingPhotoUrl ? 'Trocar foto' : 'Selecionar foto'} size="sm" variant="secondary" loading={picking} disabled={disabled} onPress={onSelectPhoto} />
          {photo ? <Button appearance="customer" title="Descartar nova foto" size="sm" variant="outline" disabled={disabled} onPress={onRemovePhoto} /> : null}
        </View>
      </View>
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
  iconBox: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16,
    height: 48, justifyContent: 'center', width: 48,
  },
  title: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 20, lineHeight: 24 },
  text: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15, lineHeight: 21 },
  photoSection: {
    alignItems: 'center', backgroundColor: customerTheme.v4.bg, borderRadius: 18,
    flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: 12,
  },
  photo: { borderRadius: 16, height: 96, width: 96 },
  photoPlaceholder: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16,
    height: 96, justifyContent: 'center', width: 96,
  },
  photoContent: { flex: 1, gap: 8, minWidth: 0 },
  photoTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 16 },
});
