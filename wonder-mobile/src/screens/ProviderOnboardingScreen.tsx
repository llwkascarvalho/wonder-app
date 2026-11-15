import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
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
import { customerTheme } from '../styles/customerTheme';
import type { ProfileStackParamList } from '../navigation/ProfileStack';
import {
  ProviderOnboardingCategory, ProviderOnboardingProfile, ProviderOnboardingSchedule,
  ProviderOnboardingService, ProviderRegistrationDraft
} from '../types/providerOnboarding';
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
  const [viewingSubmitted, setViewingSubmitted] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
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
    try {
      const loadedProfile = await obterMeuPrestador();
      setProfile(loadedProfile);
      if (loadedProfile?.status === 'pendente' && !loadedProfile.enviado_em) {
        setDraft(draftFromProfile(loadedProfile));
        setStep('servicos');
        await loadResources();
      }
    }
    catch (loadError) {
      setLoadFailed(true);
      setError(getBackendMessage(loadError, 'Não foi possível consultar seu cadastro profissional.'));
    } finally { setLoading(false); }
  }, [loadResources]);

  useEffect(() => {
    void load();
    return () => { pickerRequest.current += 1; };
  }, [load]);

  async function startCorrection() {
    if (!profile || !['rascunho', 'rejeitado', 'pendente'].includes(profile.status)) return;
    setError(''); setMessage('');
    setDraft(draftFromProfile(profile)); setPhoto(undefined); setShowValidation(false);
    const correctionRequested = ['rascunho', 'rejeitado'].includes(profile.status);
    const submitted = profile.status === 'pendente' && Boolean(profile.enviado_em);
    setViewingSubmitted(submitted);
    setStep(submitted ? 'revisao' : correctionRequested ? 'dados' : 'servicos');
    setCorrecting(correctionRequested);
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
      setShowValidation(false); setStep('endereco'); return;
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
      setShowValidation(false); setStep('servicos'); return;
    }
    if (step === 'servicos') {
      if (!services.length) { setError('Cadastre ao menos um serviço antes de continuar.'); return; }
      setShowValidation(false); setStep('horarios'); return;
    }
    if (step === 'horarios') {
      if (!schedules.length) { setError('Cadastre ao menos um horário antes de continuar.'); return; }
      setShowValidation(false); setStep('revisao');
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
    setConfirmingSubmit(false);
    setShowValidation(true);
    const requirements = correctionRequirements();
    if (requirements.length) { setError(requirements.join('\n')); return; }
    submitting.current = true; setSaving(true); setError(''); setMessage('');
    try {
      let updated = await atualizarPerfilPrestador(profile.id, buildProviderRegistrationPayload(draft));
      if (photo) updated = await uploadFotoPrestadorOnboarding(profile.id, photo);
      const submitted = await enviarPrestadorParaAprovacao(profile.id);
      setProfile({ ...updated, ...submitted }); setCorrecting(false); setViewingSubmitted(false); setPhoto(undefined);
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
    if (index > 0) {
      setShowValidation(false);
      setStep(steps[index - 1].key);
    }
  }

  if (loading) return <LoadingIndicator text="Carregando cadastro profissional..." />;
  const reviewErrors = correctionRequirements();

  const currentStepIndex = steps.findIndex((item) => item.key === step);
  const applicationInProgress = profile?.status === 'pendente' && !profile.enviado_em;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" disabled={saving || picking}
          onPress={() => navigation?.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed,
            (saving || picking) && styles.backButtonDisabled]}>
          <MaterialIcons name="chevron-left" size={28} color={customerTheme.colors.brandDark} />
        </Pressable>
        </View>
        <View style={styles.header}>
        <Text style={styles.eyebrow}>Prestador Wonder</Text>
          <Text style={styles.title}>{viewingSubmitted
            ? 'Solicitação enviada'
            : correcting ? 'Corrigir cadastro profissional' : 'Cadastro profissional'}</Text>
          <Text style={styles.subtitle}>{viewingSubmitted
            ? 'Estas são as informações que estão sendo avaliadas pelo administrador.'
            : correcting
              ? 'Revise os dados do estabelecimento antes de reenviar para aprovação.'
              : 'Conte sobre seu estabelecimento e prepare seu perfil profissional.'}</Text>
        </View>
        {error ? <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={20} color={customerTheme.colors.danger} />
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        </View> : null}
        {message ? <View style={styles.successCard}>
          <MaterialIcons name="check-circle" size={20} color="#17805A" />
          <Text style={styles.success}>{message}</Text>
        </View> : null}
        {loadFailed ? <Button title="Tentar novamente" onPress={load} />
          : profile && !correcting && !viewingSubmitted && !applicationInProgress && step === 'dados' ? (
            <>
              <View style={styles.profileCard}>
                <CatalogImage authenticated fotoUrl={profile.foto_url} kind="provider" style={styles.profilePhoto} />
                <View style={styles.profileSummary}>
                  <Text style={styles.profileLabel}>Seu estabelecimento</Text>
                  <Text style={styles.profileName}>{profile.nome_estab}</Text>
                </View>
              </View>
              <ProviderApplicationStatus profile={profile} onContinue={startCorrection} />
            </>
          ) : (
            <>
              {correcting && profile?.motivo_rejeicao ? (
                <View style={styles.correctionCard}>
                  <View style={styles.correctionIcon}><MaterialIcons name="edit-note" size={22} color="#9A6700" /></View>
                  <View style={styles.correctionContent}>
                    <Text style={styles.correctionTitle}>Correção solicitada pelo administrador</Text>
                    <Text style={styles.correctionText}>{profile.motivo_rejeicao}</Text>
                  </View>
                </View>
              ) : null}
              {!viewingSubmitted ? <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Etapa {currentStepIndex + 1} de {steps.length}</Text>
                  <Text style={styles.progressCurrent}>{steps[currentStepIndex].label}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressValue, { width: `${((currentStepIndex + 1) / steps.length) * 100}%` }]} />
                </View>
                <View style={styles.tabs}>{steps.map((item, index) => {
                  const available = index <= currentStepIndex;
                  const active = step === item.key;
                  const completed = index < currentStepIndex;
                  return (
                    <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Etapa ${item.label}`}
                      disabled={saving || picking || !available}
                      style={({ pressed }) => [styles.stepItem, pressed && available && styles.pressed]}
                      onPress={() => {
                        if (index <= currentStepIndex) {
                          setShowValidation(false);
                          setStep(item.key);
                        }
                      }}>
                      <View style={[styles.stepCircle, (active || completed) && styles.stepCircleActive]}>
                        {completed ? <MaterialIcons name="check" size={14} color="#FFFFFF" />
                          : <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>}
                      </View>
                      <Text numberOfLines={1} style={[styles.stepLabel, active && styles.stepLabelActive]}>{item.label}</Text>
                    </Pressable>
                  );
                })}</View>
              </View> : null}
              {!viewingSubmitted && step === 'dados' ? <ProviderDataStep values={draft} onChange={handleChange} errors={showValidation ? fieldErrors : {}}
                disabled={saving || picking} photo={photo} picking={picking} onSelectPhoto={handleSelectPhoto}
                existingPhotoUrl={profile?.foto_url} onRemovePhoto={() => { setPhoto(undefined); setError(''); }} /> : null}
              {!viewingSubmitted && step === 'endereco' ? <ProviderAddressStep values={draft} onChange={handleChange}
                errors={showValidation ? errors : {}} disabled={saving} /> : null}
              {!viewingSubmitted && step === 'servicos' ? <ProviderServicesStep categories={categories} services={services}
                saving={saving} disabled={saving || picking} onSave={saveService} onRemove={removeService} /> : null}
              {!viewingSubmitted && step === 'horarios' ? <ProviderSchedulesStep schedules={schedules} saving={saving}
                disabled={saving || picking} onCreate={createSchedule} onRemove={removeSchedule} /> : null}
              {step === 'revisao' ? <ProviderReviewStep values={draft} photo={photo} saving={saving}
                existingPhotoUrl={profile?.foto_url} validationErrors={viewingSubmitted ? [] : reviewErrors}
                onSubmit={viewingSubmitted ? undefined : () => setConfirmingSubmit(true)} readOnly={viewingSubmitted}
                categories={categories} services={services} schedules={schedules}
                submitTitle={correcting ? 'Reenviar para aprovação' : 'Enviar cadastro'} /> : null}
              <View style={styles.navigation}>
                {viewingSubmitted ? <Button title="Voltar ao acompanhamento" variant="secondary"
                  onPress={() => { setViewingSubmitted(false); setStep('dados'); }} style={styles.navButton} /> : <>
                  {steps.findIndex((item) => item.key === step) > 0
                    ? <Button title="Voltar" variant="secondary" disabled={saving || picking}
                      onPress={previousStep} style={styles.navButton} /> : null}
                  {step !== 'revisao' ? <Button title="Avançar" disabled={saving || picking}
                    onPress={handleAdvance} style={styles.navButton} /> : null}
                </>}
              </View>
            </>
          )}
      </ScrollView>
      <Modal transparent visible={confirmingSubmit} animationType="fade"
        onRequestClose={() => !saving && setConfirmingSubmit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}><MaterialIcons name="lock-outline" size={24} color={customerTheme.colors.brandDark} /></View>
            <Text style={styles.modalTitle}>{correcting ? 'Reenviar para análise?' : 'Enviar para análise?'}</Text>
            <Text style={styles.modalText}>Após o envio, o cadastro não poderá ser alterado até a conclusão da análise ou até que o administrador solicite uma correção.</Text>
            <View style={styles.modalActions}>
              <Button title="Voltar e revisar" variant="secondary" disabled={saving}
                onPress={() => setConfirmingSubmit(false)} style={styles.modalButton} />
              <Button title={correcting ? 'Reenviar' : 'Confirmar envio'} loading={saving}
                onPress={handleSubmit} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.colors.background, flex: 1 },
  container: {
    alignSelf: 'center', flexGrow: 1, gap: 14, maxWidth: 560,
    paddingBottom: 110, paddingHorizontal: 20, paddingTop: 24, width: '100%',
  },
  topBar: { alignItems: 'center', flexDirection: 'row' },
  header: { gap: 4, marginBottom: 4, marginTop: 4 },
  eyebrow: { color: customerTheme.colors.brand, fontSize: 12, fontWeight: '600' },
  title: { color: customerTheme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: customerTheme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  errorCard: { alignItems: 'flex-start', backgroundColor: customerTheme.colors.dangerSurface, borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  error: { color: customerTheme.colors.danger, flex: 1, fontSize: 12, lineHeight: 17 },
  successCard: { alignItems: 'flex-start', backgroundColor: '#DDF3E8', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  success: { color: '#17805A', flex: 1, fontSize: 12, lineHeight: 17 },
  correctionCard: { alignItems: 'flex-start', backgroundColor: '#FFF0C7', borderRadius: 18, flexDirection: 'row', gap: 12, padding: 14 },
  correctionIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  correctionContent: { flex: 1, gap: 4 },
  correctionTitle: { color: customerTheme.colors.text, fontSize: 13, fontWeight: '800' },
  correctionText: { color: '#795600', fontSize: 12, lineHeight: 17 },
  progressCard: { backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card, gap: 12, padding: 16, ...customerTheme.shadow },
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressTitle: { color: customerTheme.colors.textSecondary, fontSize: 11, fontWeight: '600' },
  progressCurrent: { color: customerTheme.colors.brandDark, fontSize: 12, fontWeight: '800' },
  progressTrack: { backgroundColor: '#E7E0EF', borderRadius: 999, height: 5, overflow: 'hidden' },
  progressValue: { backgroundColor: customerTheme.colors.brand, borderRadius: 999, height: 5 },
  tabs: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', gap: 5, maxWidth: 68 },
  stepCircle: { alignItems: 'center', backgroundColor: '#EEE9F4', borderRadius: 999, height: 28, justifyContent: 'center', width: 28 },
  stepCircleActive: { backgroundColor: customerTheme.colors.brandDark },
  stepNumber: { color: customerTheme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: { color: customerTheme.colors.textSecondary, fontSize: 9, fontWeight: '600' },
  stepLabelActive: { color: customerTheme.colors.brandDark, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  navigation: { flexDirection: 'row', gap: 10, marginTop: 2 },
  navButton: { flex: 1 },
  backButton: {
    alignItems: 'center', backgroundColor: customerTheme.colors.surface,
    borderRadius: customerTheme.radius.pill, height: 40, justifyContent: 'center',
    width: 40, ...customerTheme.shadow,
  },
  backButtonDisabled: { opacity: 0.5 },
  profileCard: {
    alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    flexDirection: 'row', gap: 14, padding: 16, ...customerTheme.shadow,
  },
  profilePhoto: { borderRadius: 18, height: 78, width: 78 },
  profileSummary: { flex: 1, gap: 4 },
  profileLabel: { color: customerTheme.colors.textSecondary, fontSize: 11 },
  profileName: { color: customerTheme.colors.text, fontSize: 17, fontWeight: '800' },
  modalOverlay: {
    alignItems: 'center', backgroundColor: 'rgba(36, 16, 46, 0.42)', flex: 1,
    justifyContent: 'center', padding: 20,
  },
  modalCard: {
    alignItems: 'center', backgroundColor: customerTheme.colors.surface,
    borderRadius: customerTheme.radius.card, gap: 12, maxWidth: 480, padding: 22,
    width: '100%', ...customerTheme.shadow,
  },
  modalIcon: {
    alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 18,
    height: 52, justifyContent: 'center', width: 52,
  },
  modalTitle: { color: customerTheme.colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalText: { color: customerTheme.colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  modalButton: { flex: 1 },
});
