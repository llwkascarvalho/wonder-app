import { StyleSheet, Text } from 'react-native';

import { Card } from '../Card';
import { Input } from '../Input';
import { theme } from '../../styles/theme';
import { registrationFields } from '../../utils/providerRegistration';
import { ProviderRegistrationFieldsProps } from './ProviderDataStep';

export function ProviderAddressStep({ values, onChange, errors, disabled }: ProviderRegistrationFieldsProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Endereço do estabelecimento</Text>
      <Text style={styles.text}>Os campos de endereço são opcionais.</Text>
      {(['endereco', 'numero', 'bairro', 'cidade', 'estado', 'complemento'] as const).map((key) => (
        <Input
          key={key}
          label={registrationFields[key].label}
          value={values[key]}
          maxLength={registrationFields[key].maxLength}
          editable={!disabled}
          error={errors[key]}
          autoCapitalize={key === 'estado' ? 'characters' : 'words'}
          onChangeText={(value) => onChange({ [key]: key === 'estado' ? value.toUpperCase() : value })}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
  text: { color: theme.colors.textSecondary, fontSize: theme.fontSize.sm },
});
