import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '../components/Button';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { HeroGlows } from '../components/customer/HeroGlows';
import { CustomerFeedbackCard } from '../components/customer/CustomerFeedbackCard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ProviderAddressStep } from '../components/provider-onboarding/ProviderAddressStep';
import { ProviderApplicationStatus } from '../components/provider-onboarding/ProviderApplicationStatus';
import { ProviderDataStep } from '../components/provider-onboarding/ProviderDataStep';
import { ProviderReviewStep } from '../components/provider-onboarding/ProviderReviewStep';
import { ProviderSchedulesStep } from '../components/provider-onboarding/ProviderSchedulesStep';
import { ProviderServicesStep } from '../components/provider-onboarding/ProviderServicesStep';
import {
  atualizarPerfilPrestador, atualizarServicoPrestadorOnboarding, criarHorariosPrestadorOnboarding,
  criarPerfilPrestador, criarServicoPrestadorOnboarding, enviarPrestadorParaAprovacao,
  getBackendMessage, listarCategoriasAtivas, listarMeusHorariosPrestador,
  listarMeusServicosPrestador, obterMeuPrestador, removerHorarioPrestadorOnboarding,
  removerServicoPrestadorOnboarding, uploadFotoPrestadorOnboarding,
} from '../services/providerOnboarding';
import { uploadFotoServico } from '../services/provider';
import { validateProfilePhoto } from '../services/profileService';
import { customerTheme } from '../styles/customerTheme';
import type { ProfileStackParamList } from '../navigation/ProfileStack';
import { useResetScrollOnFocus } from '../navigation/useResetScrollOnFocus';
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
  const scrollRef = useRef<ScrollView>(null);
  useResetScrollOnFocus(scrollRef);
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [step, setStep] = useState<StepKey>('dados');
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  const [draft, setDraft] = useState<ProviderRegistrationDraft>({ ...emptyProviderDraft });
  const [profile, setProfile] = useState<ProviderOnboardingProfile | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [viewingSubmitted, setViewingSubmitted] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [submittedConfirmation, setSubmittedConfirmation] = useState(false);
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
      setSubmittedConfirmation(true);
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

  async function createSchedule(payload: { dia_semana: number; hora_inicio: string; hora_fim: string }[]) {
    if (!profile) return;
    setSaving(true); setError('');
    try {
      const created = await criarHorariosPrestadorOnboarding(profile.id, payload);
      setSchedules((current) => [...current, ...created]);
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
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, desktop && styles.heroDesktop]}>
          <HeroGlows desktop={desktop} />
          <View style={styles.heroContent}>
          <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" disabled={saving || picking}
          onPress={() => navigation?.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed,
            (saving || picking) && styles.backButtonDisabled]}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.header}>
        <Text style={styles.eyebrow}>Prestador Wonder</Text>
          <Text style={styles.title}>{viewingSubmitted
            ? 'Solicitação enviada'
            : correcting ? 'Corrigir cadastro' : 'Cadastro profissional'}</Text>
        </View>
          </View>
          <Text style={styles.subtitle}>{viewingSubmitted
            ? 'Estas são as informações que estão sendo avaliadas pelo administrador.'
            : correcting
              ? 'Revise os dados do estabelecimento antes de reenviar para aprovação.'
              : 'Conte sobre seu estabelecimento e prepare seu perfil profissional.'}</Text>
          </View>
        </View>
        <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
        <View style={styles.container}>
        {error ? <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={20} color={customerTheme.colors.danger} />
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        </View> : null}
        {message ? <View style={styles.successCard}>
          <MaterialIcons name="check-circle" size={20} color="#17805A" />
          <Text style={styles.success}>{message}</Text>
        </View> : null}
        {loadFailed ? <Button appearance="customer" title="Tentar novamente" onPress={load} />
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
                      <View style={[styles.stepCircle, (active || completed) && styles.stepCircleActive, active && styles.stepCircleCurrent]}>
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
                {viewingSubmitted ? <Button appearance="customer" title="Voltar ao acompanhamento" variant="secondary"
                  onPress={() => { setViewingSubmitted(false); setStep('dados'); }} style={styles.navButton} /> : <>
                  {steps.findIndex((item) => item.key === step) > 0
                    ? <Button appearance="customer" title="Voltar" variant="secondary" disabled={saving || picking}
                      onPress={previousStep} style={styles.navButton} /> : null}
                  {step !== 'revisao' ? <Button appearance="customer" title="Avançar" disabled={saving || picking}
                    onPress={handleAdvance} style={styles.navButton} /> : null}
                </>}
              </View>
            </>
          )}
        </View>
        </View>
      </ScrollView>
      <Modal transparent visible={confirmingSubmit} animationType="fade"
        onRequestClose={() => !saving && setConfirmingSubmit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}><MaterialIcons name="lock-outline" size={24} color={customerTheme.colors.brandDark} /></View>
            <Text style={styles.modalTitle}>{correcting ? 'Reenviar para análise?' : 'Enviar para análise?'}</Text>
            <Text style={styles.modalText}>Após o envio, o cadastro não poderá ser alterado até a conclusão da análise ou até que o administrador solicite uma correção.</Text>
            <View style={styles.modalActions}>
              <Button appearance="customer" title="Voltar e revisar" variant="secondary" disabled={saving}
                onPress={() => setConfirmingSubmit(false)} style={styles.modalButton} />
              <Button appearance="customer" title={correcting ? 'Reenviar' : 'Confirmar envio'} loading={saving}
                onPress={handleSubmit} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={submittedConfirmation} animationType="fade"
        onRequestClose={() => setSubmittedConfirmation(false)}>
        <View style={styles.modalOverlay}>
          <CustomerFeedbackCard kind="success" title="Cadastro enviado para análise"
            description="Sua solicitação foi recebida e está aguardando a análise do administrador. Você será avisado no app quando houver uma decisão.">
            <Text style={styles.modalHint}>Os detalhes da decisão também serão enviados para o e-mail da sua conta.</Text>
            <Button appearance="customer" title="Acompanhar solicitação" onPress={() => {
              setSubmittedConfirmation(false);
              setViewingSubmitted(true);
              setStep('revisao');
            }} style={styles.modalFullButton} />
          </CustomerFeedbackCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.v4.bg, flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { backgroundColor: customerTheme.v4.primary, minHeight: 203, overflow: 'hidden', paddingBottom: 56, paddingTop: 44 },
  heroDesktop: { paddingBottom: 76, paddingTop: 44 },
  heroContent: { alignSelf: 'center', maxWidth: 1040, paddingHorizontal: 20, width: '100%', zIndex: 1 },
  sheet: { backgroundColor: customerTheme.v4.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, flexGrow: 1, marginTop: -28, paddingTop: 24 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingTop: 36 },
  container: {
    alignSelf: 'center', gap: 16, maxWidth: 560,
    paddingBottom: 150, paddingHorizontal: 20, width: '100%',
  },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  header: { flex: 1, gap: 2 },
  eyebrow: { color: '#FFFFFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 14 },
  title: { color: '#FFFFFF', fontFamily: customerTheme.v4.fontDisplay, fontSize: 24, lineHeight: 28 },
  subtitle: { color: '#FFFFFF', fontFamily: customerTheme.v4.fontBody, fontSize: 15, lineHeight: 20, marginLeft: 56, marginTop: 10 },
  errorCard: { alignItems: 'flex-start', backgroundColor: customerTheme.colors.dangerSurface, borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  error: { color: customerTheme.v4.danger, flex: 1, fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 20 },
  successCard: { alignItems: 'flex-start', backgroundColor: '#DDF3E8', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  success: { color: '#17805A', flex: 1, fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 20 },
  successModalIcon: { alignItems: 'center', backgroundColor: '#DDF3E8', borderRadius: 999, height: 58, justifyContent: 'center', marginBottom: 4, width: 58 },
  correctionCard: { alignItems: 'flex-start', backgroundColor: '#FFF0D6', borderRadius: 20, flexDirection: 'row', gap: 12, padding: 14 },
  correctionIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, height: 40, justifyContent: 'center', width: 40 },
  correctionContent: { flex: 1, gap: 4 },
  correctionTitle: { color: '#9A5200', fontFamily: customerTheme.v4.fontBodyBold, fontSize: 15 },
  correctionText: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 19 },
  progressCard: { backgroundColor: customerTheme.v4.surface, borderRadius: 24, gap: 14, padding: 16, ...customerTheme.shadow },
  progressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressTitle: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 14 },
  progressCurrent: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 14 },
  progressTrack: { backgroundColor: customerTheme.v4.lilac, borderRadius: 999, height: 6, overflow: 'hidden' },
  progressValue: { backgroundColor: customerTheme.v4.primary, borderRadius: 999, height: 6 },
  tabs: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', gap: 6, width: 58 },
  stepCircle: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  stepCircleActive: { backgroundColor: customerTheme.v4.primary },
  stepCircleCurrent: { borderColor: customerTheme.v4.lilac, borderWidth: 4 },
  stepNumber: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 14 },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 11 },
  stepLabelActive: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodyBold },
  pressed: { opacity: 0.75 },
  navigation: { flexDirection: 'row', gap: 16, marginTop: 8 },
  navButton: { flex: 1 },
  backButton: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 22, height: 44, justifyContent: 'center', width: 44,
  },
  backButtonDisabled: { opacity: 0.5 },
  profileCard: {
    alignItems: 'center', backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    flexDirection: 'row', gap: 14, padding: 16, ...customerTheme.shadow,
  },
  profilePhoto: { borderRadius: 18, height: 78, width: 78 },
  profileSummary: { flex: 1, gap: 4 },
  profileLabel: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 14 },
  profileName: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 20 },
  modalOverlay: {
    alignItems: 'center', backgroundColor: 'rgba(46,10,87,0.62)', flex: 1,
    justifyContent: 'center', padding: 20,
  },
  modalCard: {
    alignItems: 'center', backgroundColor: customerTheme.v4.surface,
    borderRadius: 28, gap: 12, maxWidth: 480, padding: 24,
    width: '100%', ...customerTheme.shadow,
  },
  modalIcon: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 36,
    height: 72, justifyContent: 'center', width: 72,
  },
  modalTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 24, lineHeight: 28, textAlign: 'center' },
  modalText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  modalHint: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  modalButton: { flex: 1 },
  modalFullButton: { alignSelf: 'stretch', marginTop: 4 },
});
