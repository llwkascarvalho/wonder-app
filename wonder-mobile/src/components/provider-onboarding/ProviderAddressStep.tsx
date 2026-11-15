import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Input } from '../Input';
import { customerTheme } from '../../styles/customerTheme';
import { registrationFields } from '../../utils/providerRegistration';
import { ProviderRegistrationFieldsProps } from './ProviderDataStep';

export function ProviderAddressStep({ values, onChange, errors, disabled }: ProviderRegistrationFieldsProps) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBox}><MaterialIcons name="location-on" size={20} color={customerTheme.colors.brandDark} /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Endereço do estabelecimento</Text>
          <Text style={styles.text}>Preencha os campos obrigatórios indicados com *.</Text>
        </View>
      </View>
      {(['endereco', 'numero', 'bairro', 'cidade', 'estado', 'complemento'] as const).map((key) => (
        <Input
          key={key}
          label={`${registrationFields[key].label}${registrationFields[key].required ? ' *' : ''}`}
          value={values[key]}
          maxLength={registrationFields[key].maxLength}
          editable={!disabled}
          error={errors[key]}
          appearance="customer"
          autoCapitalize={key === 'estado' ? 'characters' : 'words'}
          onChangeText={(value) => onChange({ [key]: key === 'estado' ? value.toUpperCase() : value })}
        />
      ))}
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
});
