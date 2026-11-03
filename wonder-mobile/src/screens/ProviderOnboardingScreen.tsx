import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ProviderAddressStep } from '../components/provider-onboarding/ProviderAddressStep';
import { ProviderApplicationStatus } from '../components/provider-onboarding/ProviderApplicationStatus';
import { ProviderDataStep } from '../components/provider-onboarding/ProviderDataStep';
import { ProviderReviewStep } from '../components/provider-onboarding/ProviderReviewStep';
import { ProviderSchedulesStep } from '../components/provider-onboarding/ProviderSchedulesStep';
import { ProviderServicesStep } from '../components/provider-onboarding/ProviderServicesStep';
import {
  atualizarPerfilPrestador, atualizarServicoPrestadorOnboarding, criarHorarioPrestadorOnboarding,
  criarPerfilPrestador, criarServicoPrestadorOnboarding, enviarPrestadorParaAprovacao,
  getBackendMessage, listarCategoriasAtivas, listarMeusHorariosPrestador,
  listarMeusServicosPrestador, obterMeuPrestador, removerHorarioPrestadorOnboarding,
  removerServicoPrestadorOnboarding, uploadFotoPrestadorOnboarding,
} from '../services/providerOnboarding';
import { uploadFotoServico } from '../services/provider';
import { validateProfilePhoto } from '../services/profileService';
import { theme } from '../styles/theme';
import type { ProfileStackParamList } from '../navigation/ProfileStack';
import { ProviderOnboardingCategory, ProviderOnboardingProfile, ProviderOnboardingSchedule,
  ProviderOnboardingService, ProviderRegistrationDraft } from '../types/providerOnboarding';
import { ProfilePhotoAsset } from '../types/profile';
import {
  buildProviderRegistrationPayload, emptyProviderDraft, validateProviderRegistration,
} from '../utils/providerRegistration';

const steps = [
  { key: 'dados', label: 'Dados' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'horarios', label: 'Horários' },
  { key: 'revisao', label: 'Revisão' },
] as const;

type StepKey = typeof steps[number]['key'];
type ProviderOnboardingScreenProps = Partial<NativeStackScreenProps<ProfileStackParamList, 'ProviderOnboarding'>>;

function draftFromProfile(profile: ProviderOnboardingProfile): ProviderRegistrationDraft {
  return {
    nomeEstab: profile.nome_estab || '', documento: profile.documento || '',
    endereco: profile.endereco || '', numero: profile.numero || '', bairro: profile.bairro || '',
    cidade: profile.cidade || '', estado: profile.estado || '', complemento: profile.complemento || '',
  };
}

export function ProviderOnboardingScreen({ navigation }: ProviderOnboardingScreenProps = {}) {
  const [step, setStep] = useState<StepKey>('dados');
  const [draft, setDraft] = useState<ProviderRegistrationDraft>({ ...emptyProviderDraft });
  const [profile, setProfile] = useState<ProviderOnboardingProfile | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<ProfilePhotoAsset>();
  const [picking, setPicking] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<ProviderOnboardingCategory[]>([]);
  const [services, setServices] = useState<ProviderOnboardingService[]>([]);
  const [schedules, setSchedules] = useState<ProviderOnboardingSchedule[]>([]);
  const submitting = useRef(false);
  const selecting = useRef(false);
  const pickerRequest = useRef(0);
  const errors = useMemo(() => validateProviderRegistration(draft), [draft]);
  const fieldErrors = errors;

  const loadResources = useCallback(async () => {
    const [loadedCategories, loadedServices, loadedSchedules] = await Promise.all([
      listarCategoriasAtivas(), listarMeusServicosPrestador(), listarMeusHorariosPrestador(),
    ]);
    setCategories(loadedCategories); setServices(loadedServices); setSchedules(loadedSchedules);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setLoadFailed(false);
    try { setProfile(await obterMeuPrestador()); }
    catch (loadError) {
      setLoadFailed(true);
      setError(getBackendMessage(loadError, 'Não foi possível consultar seu cadastro profissional.'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    return () => { pickerRequest.current += 1; };
  }, [load]);

  async function startCorrection() {
    if (!profile || !['rascunho', 'rejeitado', 'pendente'].includes(profile.status)) return;
    setError(''); setMessage('');
    setDraft(draftFromProfile(profile)); setPhoto(undefined); setShowValidation(true);
    const correctionRequested = ['rascunho', 'rejeitado'].includes(profile.status);
    setStep(correctionRequested ? 'dados' : 'servicos'); setCorrecting(correctionRequested);
    try { await loadResources(); }
    catch (resourceError) { setError(getBackendMessage(resourceError, 'Não foi possível carregar serviços e horários.')); }
  }

  async function handleSelectPhoto() {
    if (submitting.current || selecting.current) return;
    selecting.current = true;
    const request = ++pickerRequest.current;
    setPicking(true); setError('');
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
      validateProfilePhoto(asset); setPhoto(asset);
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
    setDraft((current) => ({ ...current, ...changes })); setError(''); setMessage('');
  }

  async function handleAdvance() {
    setShowValidation(true);
    if (step === 'dados') {
      if (fieldErrors.nomeEstab || fieldErrors.documento) return;
      setStep('endereco'); return;
    }
    if (step === 'endereco') {
      const fields = ['endereco', 'numero', 'bairro', 'cidade', 'estado', 'complemento'] as const;
      if (fields.some((field) => fieldErrors[field])) return;
      if (!profile) {
        submitting.current = true; setSaving(true); setError('');
        try {
          const created = await criarPerfilPrestador(buildProviderRegistrationPayload(draft), photo);
          setProfile(created); setPhoto(undefined);
          await loadResources();
        } catch (submitError) {
          setError(getBackendMessage(submitError, 'Não foi possível salvar o rascunho. Seus dados foram mantidos.'));
          return;
        } finally { submitting.current = false; setSaving(false); }
      }
      setStep('servicos'); return;
    }
    if (step === 'servicos') {
      if (!services.length) { setError('Cadastre ao menos um serviço antes de continuar.'); return; }
      setStep('horarios'); return;
    }
    if (step === 'horarios') {
      if (!schedules.length) { setError('Cadastre ao menos um horário antes de continuar.'); return; }
      setStep('revisao');
    }
  }

  function correctionRequirements() {
    return [
      ...Object.values(errors),
      ...(!services.length ? ['Cadastre ao menos um serviço.'] : []),
      ...(!schedules.length ? ['Cadastre ao menos um horário de atendimento.'] : []),
    ];
  }

  async function handleSubmit() {
    if (!profile || submitting.current || selecting.current) return;
    setShowValidation(true);
    const requirements = correctionRequirements();
    if (requirements.length) { setError(requirements.join('\n')); return; }
    submitting.current = true; setSaving(true); setError(''); setMessage('');
    try {
      if (!correcting) {
        setStep('dados');
        setMessage('Cadastro enviado e aguardando análise do administrador.');
        return;
      }
      let updated = await atualizarPerfilPrestador(profile.id, buildProviderRegistrationPayload(draft));
      if (photo) updated = await uploadFotoPrestadorOnboarding(profile.id, photo);
      const submitted = await enviarPrestadorParaAprovacao(profile.id);
      setProfile({ ...updated, ...submitted }); setCorrecting(false); setPhoto(undefined);
      setStep('dados');
      setMessage(correcting ? 'Cadastro corrigido e reenviado para aprovação.' : 'Cadastro enviado para aprovação.');
    } catch (submitError) {
      setError(getBackendMessage(submitError, 'Não foi possível reenviar o cadastro. As correções salvas foram mantidas.'));
    } finally { submitting.current = false; setSaving(false); }
  }

  async function saveService(payload: { nome: string; preco: number; duracao_min: number; categoria_id?: number }, servicePhoto?: ProfilePhotoAsset, existing?: ProviderOnboardingService) {
    if (!profile || !payload.categoria_id) return;
    setSaving(true); setError('');
    try {
      const saved = existing
        ? await atualizarServicoPrestadorOnboarding(profile.id, existing.id, { ...payload, categoria_id: payload.categoria_id })
        : await criarServicoPrestadorOnboarding(profile.id, { ...payload, categoria_id: payload.categoria_id });
      const finalService = servicePhoto ? await uploadFotoServico(profile.id, saved.id, servicePhoto) : saved;
      setServices((current) => existing
        ? current.map((item) => item.id === finalService.id ? finalService : item)
        : [...current, finalService]);
    } catch (serviceError) { throw new Error(getBackendMessage(serviceError, 'Não foi possível salvar o serviço.')); }
    finally { setSaving(false); }
  }

  async function removeService(serviceId: number) {
    if (!profile) return;
    setSaving(true); setError('');
    try { await removerServicoPrestadorOnboarding(profile.id, serviceId); setServices((current) => current.filter((item) => item.id !== serviceId)); }
    catch (serviceError) { setError(getBackendMessage(serviceError, 'Não foi possível remover o serviço.')); }
    finally { setSaving(false); }
  }

  async function createSchedule(payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) {
    if (!profile) return;
    setSaving(true); setError('');
    try {
      const created = await criarHorarioPrestadorOnboarding(profile.id, payload);
      setSchedules((current) => [...current, created]);
    }
    catch (scheduleError) { throw new Error(getBackendMessage(scheduleError, 'Não foi possível salvar o horário.')); }
    finally { setSaving(false); }
  }

  async function removeSchedule(scheduleId: number) {
    if (!profile) return;
    setSaving(true); setError('');
    try { await removerHorarioPrestadorOnboarding(profile.id, scheduleId); setSchedules((current) => current.filter((item) => item.id !== scheduleId)); }
    catch (scheduleError) { setError(getBackendMessage(scheduleError, 'Não foi possível remover o horário.')); }
    finally { setSaving(false); }
  }

  function previousStep() {
    const index = steps.findIndex((item) => item.key === step);
    const minimumIndex = profile && !correcting ? 2 : 0;
    if (index > minimumIndex) setStep(steps[index - 1].key);
  }

  if (loading) return <LoadingIndicator text="Carregando cadastro profissional..." />;
  const reviewErrors = correctionRequirements();

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Button title="Voltar ao perfil" variant="outline" size="sm" disabled={saving || picking}
        onPress={() => navigation?.goBack()} style={styles.backButton} />
      <View style={styles.header}>
        <Text style={styles.title}>{correcting ? 'Corrigir cadastro profissional' : 'Cadastro profissional'}</Text>
        <Text style={styles.subtitle}>{correcting
          ? 'Revise os dados do estabelecimento antes de reenviar para aprovação.'
          : 'Preencha os dados do estabelecimento e revise antes de enviar.'}</Text>
      </View>
      {error ? <Card><Text accessibilityRole="alert" style={styles.error}>{error}</Text></Card> : null}
      {message ? <Card><Text style={styles.success}>{message}</Text></Card> : null}
      {loadFailed ? <Button title="Tentar novamente" onPress={load} /> : profile && !correcting && step === 'dados' ? (
        <>
          <Card style={styles.profileCard}>
            <CatalogImage authenticated fotoUrl={profile.foto_url} kind="provider" style={styles.profilePhoto} />
            <Text style={styles.subtitle}>{profile.nome_estab}</Text>
          </Card>
          <ProviderApplicationStatus profile={profile} onContinue={startCorrection} />
        </>
      ) : (
        <>
          {correcting && profile?.motivo_rejeicao ? (
            <Card style={styles.correctionCard}>
              <Text style={styles.correctionTitle}>Correção solicitada pelo administrador</Text>
              <Text style={styles.subtitle}>{profile.motivo_rejeicao}</Text>
            </Card>
          ) : null}
          <View style={styles.tabs}>{steps.map((item, index) => (
            <Button key={item.key} title={item.label} size="sm" disabled={saving || picking}
              variant={step === item.key ? 'primary' : 'outline'}
              onPress={() => {
                const currentIndex = steps.findIndex((current) => current.key === step);
                const minimumIndex = profile && !correcting ? 2 : 0;
                if (index >= minimumIndex && index <= currentIndex) setStep(item.key);
              }} />
          ))}</View>
          {step === 'dados' ? <ProviderDataStep values={draft} onChange={handleChange} errors={showValidation ? fieldErrors : {}}
            disabled={saving || picking} photo={photo} picking={picking} onSelectPhoto={handleSelectPhoto}
            existingPhotoUrl={profile?.foto_url} onRemovePhoto={() => { setPhoto(undefined); setError(''); }} /> : null}
          {step === 'endereco' ? <ProviderAddressStep values={draft} onChange={handleChange}
            errors={showValidation ? errors : {}} disabled={saving} /> : null}
          {step === 'servicos' ? <ProviderServicesStep categories={categories} services={services}
            saving={saving} disabled={saving || picking} onSave={saveService} onRemove={removeService} /> : null}
          {step === 'horarios' ? <ProviderSchedulesStep schedules={schedules} saving={saving}
            disabled={saving || picking} onCreate={createSchedule} onRemove={removeSchedule} /> : null}
          {step === 'revisao' ? <ProviderReviewStep values={draft} photo={photo} saving={saving}
            existingPhotoUrl={profile?.foto_url} validationErrors={reviewErrors} onSubmit={handleSubmit}
            categories={categories} services={services} schedules={schedules}
            submitTitle={correcting ? 'Reenviar para aprovação' : 'Enviar cadastro'} /> : null}
          <View style={styles.navigation}>
            {steps.findIndex((item) => item.key === step) > (profile && !correcting ? 2 : 0)
              ? <Button title="Voltar" variant="secondary" disabled={saving || picking}
              onPress={previousStep} style={styles.navButton} /> : null}
            {step !== 'revisao' ? <Button title="Avançar" disabled={saving || picking}
              onPress={handleAdvance} style={styles.navButton} /> : null}
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
  success: { color: theme.colors.success, fontSize: theme.fontSize.sm },
  correctionCard: { gap: theme.spacing.xs },
  correctionTitle: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  navigation: { flexDirection: 'row', gap: theme.spacing.sm },
  navButton: { flex: 1 },
  backButton: { alignSelf: 'flex-start' },
  profileCard: { alignItems: 'center', gap: theme.spacing.sm },
  profilePhoto: { borderRadius: theme.borderRadius.md, height: 120, width: 120 },
});
