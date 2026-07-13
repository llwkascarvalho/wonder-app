import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { theme } from '../../styles/theme';
import { ProviderOnboardingProfile } from '../../types/providerOnboarding';

type ProviderDataStepProps = {
  profile: ProviderOnboardingProfile | null;
  saving: boolean;
  onAdvance: (payload: { nome_estab: string; documento: string }) => Promise<void>;
};

export function ProviderDataStep({ profile, saving, onAdvance }: ProviderDataStepProps) {
  const [nomeEstab, setNomeEstab] = useState(profile?.nome_estab || '');
  const [documento, setDocumento] = useState(profile?.documento || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setNomeEstab(profile?.nome_estab || '');
    setDocumento(profile?.documento || '');
  }, [profile]);

  async function handleSave() {
    if (!nomeEstab.trim() || !documento.trim()) {
      setError('Informe nome do estabelecimento e documento.');
      return;
    }

    setError('');
    await onAdvance({
      nome_estab: nomeEstab.trim(),
      documento: documento.trim(),
    });
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Dados do estabelecimento</Text>
      <Input
        label="Nome do estabelecimento"
        placeholder="Diego BarberShop"
        value={nomeEstab}
        onChangeText={setNomeEstab}
      />
      <Input label="CPF/CNPJ" placeholder="00.000.000/0000-00" value={documento} onChangeText={setDocumento} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Avancar" loading={saving} onPress={handleSave} />
    </Card>
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
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
