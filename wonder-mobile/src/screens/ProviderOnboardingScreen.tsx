import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ProviderAddressStep } from '../components/provider-onboarding/ProviderAddressStep';
import { ProviderApplicationStatus } from '../components/provider-onboarding/ProviderApplicationStatus';
import { ProviderDataStep } from '../components/provider-onboarding/ProviderDataStep';
import { ProviderReviewStep } from '../components/provider-onboarding/ProviderReviewStep';
import { criarPerfilPrestador, getBackendMessage, obterMeuPrestador } from '../services/providerOnboarding';
import { validateProfilePhoto } from '../services/profileService';
import { theme } from '../styles/theme';
import { ProviderOnboardingProfile, ProviderRegistrationDraft } from '../types/providerOnboarding';
import { ProfilePhotoAsset } from '../types/profile';
import {
  buildProviderRegistrationPayload, emptyProviderDraft, validateProviderRegistration,
} from '../utils/providerRegistration';

const steps = [
  { key: 'dados', label: 'Dados' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'revisao', label: 'Revisão' },
] as const;
type StepKey = typeof steps[number]['key'];

export function ProviderOnboardingScreen() {
  const [step, setStep] = useState<StepKey>('dados');
  const [draft, setDraft] = useState<ProviderRegistrationDraft>({ ...emptyProviderDraft });
  const [profile, setProfile] = useState<ProviderOnboardingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<ProfilePhotoAsset>();
  const [picking, setPicking] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const selecting = useRef(false);
  const pickerRequest = useRef(0);
  const errors = useMemo(() => validateProviderRegistration(draft), [draft]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      setProfile(await obterMeuPrestador());
    } catch (loadError) {
      setLoadFailed(true);
      setError(getBackendMessage(loadError, 'Não foi possível consultar seu cadastro profissional.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { pickerRequest.current += 1; };
  }, [load]);

  async function handleSelectPhoto() {
    if (submitting.current || selecting.current) return;
    selecting.current = true;
    const request = ++pickerRequest.current;
    setPicking(true);
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (request !== pickerRequest.current) return;
        if (!permission.granted) {
          setError('Permita o acesso à galeria nas configurações para selecionar uma foto.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (request !== pickerRequest.current || result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      validateProfilePhoto(asset);
      setPhoto(asset);
    } catch (photoError) {
      if (request === pickerRequest.current) {
        setError(photoError instanceof Error ? photoError.message : 'Não foi possível selecionar a foto.');
      }
    } finally {
      selecting.current = false;
      if (request === pickerRequest.current) setPicking(false);
    }
  }

  function handleChange(changes: Partial<ProviderRegistrationDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setError('');
  }

  function handleAdvance() {
    setShowValidation(true);
    const fields = step === 'dados'
      ? ['nomeEstab', 'documento'] as const
      : ['endereco', 'numero', 'bairro', 'cidade', 'estado', 'complemento'] as const;
    if (fields.some((field) => errors[field])) return;
    setStep(step === 'dados' ? 'endereco' : 'revisao');
  }

  async function handleSubmit() {
    if (submitting.current || selecting.current || profile || loadFailed) return;
    setShowValidation(true);
    if (Object.keys(errors).length) {
      setError('Revise os campos indicados antes de enviar o cadastro.');
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      const result = await criarPerfilPrestador(buildProviderRegistrationPayload(draft), photo);
      setProfile(result);
    } catch (submitError) {
      setError(getBackendMessage(submitError, 'Não foi possível enviar o cadastro. Seus dados foram mantidos para tentar novamente.'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (loading) return <LoadingIndicator text="Carregando cadastro profissional..." />;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Cadastro profissional</Text>
        <Text style={styles.subtitle}>Preencha os dados do estabelecimento e revise antes de enviar.</Text>
      </View>
      {error ? <Card><Text accessibilityRole="alert" style={styles.error}>{error}</Text></Card> : null}
      {loadFailed ? <Button title="Tentar novamente" onPress={load} /> : profile ? (
        <>
          <Card><Text style={styles.subtitle}>{profile.nome_estab}</Text></Card>
          {['pendente', 'ativo', 'rejeitado', 'suspenso'].includes(profile.status)
            ? <ProviderApplicationStatus profile={profile} />
            : <Card><Text style={styles.subtitle}>Você já possui um cadastro profissional registrado.</Text></Card>}
        </>
      ) : (
        <>
          <View style={styles.tabs}>
            {steps.map((item) => (
              <Button key={item.key} title={item.label} size="sm" disabled={saving || picking}
                variant={step === item.key ? 'primary' : 'outline'} onPress={() => setStep(item.key)} />
            ))}
          </View>
          {step === 'dados' ? <ProviderDataStep values={draft} onChange={handleChange} errors={showValidation ? errors : {}} disabled={saving || picking}
            photo={photo} picking={picking} onSelectPhoto={handleSelectPhoto} onRemovePhoto={() => { setPhoto(undefined); setError(''); }} /> : null}
          {step === 'endereco' ? <ProviderAddressStep values={draft} onChange={handleChange} errors={showValidation ? errors : {}} disabled={saving} /> : null}
          {step === 'revisao' ? <ProviderReviewStep values={draft} photo={photo} saving={saving} validationErrors={Object.values(errors)} onSubmit={handleSubmit} /> : null}
          <View style={styles.navigation}>
            {step !== 'dados' ? <Button title="Voltar" variant="secondary" disabled={saving || picking}
              onPress={() => setStep(step === 'revisao' ? 'endereco' : 'dados')} style={styles.navButton} /> : null}
            {step !== 'revisao' ? <Button title="Avançar" disabled={saving || picking} onPress={handleAdvance} style={styles.navButton} /> : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background, gap: theme.spacing.md, padding: theme.spacing.lg, paddingVertical: theme.spacing.xxl },
  header: { gap: theme.spacing.xs },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, lineHeight: 22 },
  error: { color: theme.colors.error, fontSize: theme.fontSize.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  navigation: { flexDirection: 'row', gap: theme.spacing.sm },
  navButton: { flex: 1 },
});
