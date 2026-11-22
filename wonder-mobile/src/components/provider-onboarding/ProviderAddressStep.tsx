import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Input } from '../Input';
import { customerTheme } from '../../styles/customerTheme';
import { registrationFields } from '../../utils/providerRegistration';
import { ProviderRegistrationFieldsProps } from './ProviderDataStep';

export function ProviderAddressStep({ values, onChange, errors, disabled }: ProviderRegistrationFieldsProps) {
  function field(key: 'endereco' | 'numero' | 'bairro' | 'cidade' | 'estado' | 'complemento') {
    return <Input
      key={key}
      label={`${registrationFields[key].label}${registrationFields[key].required ? ' *' : ''}`}
      value={values[key]}
      maxLength={registrationFields[key].maxLength}
      editable={!disabled}
      error={errors[key]}
      appearance="customer"
      autoCapitalize={key === 'estado' ? 'characters' : 'words'}
      onChangeText={(value) => onChange({ [key]: key === 'estado' ? value.toUpperCase() : value })}
    />;
  }
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.iconBox}><MaterialIcons name="location-on" size={26} color={customerTheme.v4.primary} /></View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Endereço do estabelecimento</Text>
          <Text style={styles.text}>Preencha os campos obrigatórios indicados com *.</Text>
        </View>
      </View>
      {field('endereco')}
      <View style={styles.row}><View style={styles.grow}>{field('numero')}</View><View style={styles.grow}>{field('bairro')}</View></View>
      <View style={styles.row}><View style={styles.grow}>{field('cidade')}</View><View style={styles.stateField}>{field('estado')}</View></View>
      {field('complemento')}
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
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  stateField: { minWidth: 72, width: 84 },
  iconBox: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16,
    height: 48, justifyContent: 'center', width: 48,
  },
  title: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 20, lineHeight: 24 },
  text: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15, lineHeight: 21 },
});
