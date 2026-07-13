import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ProviderApplicationStatus } from '../components/provider-onboarding/ProviderApplicationStatus';
import { ProviderCategoriesStep } from '../components/provider-onboarding/ProviderCategoriesStep';
import { ProviderDataStep } from '../components/provider-onboarding/ProviderDataStep';
import { ProviderReviewStep } from '../components/provider-onboarding/ProviderReviewStep';
import { ProviderSchedulesStep } from '../components/provider-onboarding/ProviderSchedulesStep';
import { ProviderServicesStep } from '../components/provider-onboarding/ProviderServicesStep';
import {
  associarMinhasCategoriasPrestador,
  atualizarPerfilPrestador,
  criarHorarioPrestadorOnboarding,
  criarPerfilPrestador,
  criarServicoPrestadorOnboarding,
  enviarPrestadorParaAprovacao,
  getBackendMessage,
  listarCategoriasAtivas,
  listarHorariosPrestadorOnboarding,
  listarHorariosPrestadorOnboardingSeguro,
  listarMinhasCategoriasPrestador,
  listarMinhasCategoriasPrestadorSeguro,
  listarServicosPrestadorOnboarding,
  listarServicosPrestadorOnboardingSeguro,
  obterMeuPrestador,
  removerHorarioPrestadorOnboarding,
  removerMinhaCategoriaPrestador,
} from '../services/providerOnboarding';
import { theme } from '../styles/theme';
import {
  ProviderCategoryLink,
  ProviderOnboardingCategory,
  ProviderOnboardingProfile,
  ProviderOnboardingSchedule,
  ProviderOnboardingService,
} from '../types/providerOnboarding';

type StepKey = 'dados' | 'categorias' | 'servicos' | 'horarios' | 'revisao';

const steps: Array<{ key: StepKey; label: string }> = [
  { key: 'dados', label: 'Dados' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'servicos', label: 'Servicos' },
  { key: 'horarios', label: 'Horarios' },
  { key: 'revisao', label: 'Revisao' },
];

export function ProviderOnboardingScreen() {
  const [step, setStep] = useState<StepKey>('dados');
  const [profile, setProfile] = useState<ProviderOnboardingProfile | null>(null);
  const [categories, setCategories] = useState<ProviderOnboardingCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<ProviderCategoryLink[]>([]);
  const [services, setServices] = useState<ProviderOnboardingService[]>([]);
  const [schedules, setSchedules] = useState<ProviderOnboardingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [error, setError] = useState('');
  const [showEditableRejected, setShowEditableRejected] = useState(false);

  const readonly = profile?.status === 'pendente' || profile?.status === 'ativo';
  const canEditRejected = profile?.status === 'rejeitado' || profile?.status === 'suspenso';
  const canEdit = !readonly;
  const hasProfileId = Boolean(profile?.id);

  const load = useCallback(async () => {
    setError('');
    try {
      const [nextProfile, nextCategories] = await Promise.all([obterMeuPrestador(), listarCategoriasAtivas()]);
      setProfile(nextProfile);
      setCategories(nextCategories);

      if (!nextProfile) {
        setSelectedCategories([]);
        setServices([]);
        setSchedules([]);
        setStep('dados');
        return;
      }

      const [nextSelectedCategories, nextServices, nextSchedules] = await Promise.all([
        listarMinhasCategoriasPrestadorSeguro(),
        listarServicosPrestadorOnboardingSeguro(nextProfile.id),
        listarHorariosPrestadorOnboardingSeguro(nextProfile.id),
      ]);

      setSelectedCategories(nextSelectedCategories);
      setServices(nextServices);
      setSchedules(nextSchedules);

      if (nextProfile.status === 'rascunho' || nextProfile.status === 'rejeitado' || nextProfile.status === 'suspenso') {
        setStep(getResumeStep(nextProfile, nextSelectedCategories, nextServices, nextSchedules));
      }
    } catch (loadError) {
      setError(getBackendMessage(loadError, 'Nao foi possivel carregar o cadastro profissional.'));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function reloadProfileData(nextProfile = profile) {
    if (!nextProfile) {
      return;
    }

    const [nextSelectedCategories, nextServices, nextSchedules] = await Promise.all([
      listarMinhasCategoriasPrestadorSeguro(),
      listarServicosPrestadorOnboardingSeguro(nextProfile.id),
      listarHorariosPrestadorOnboardingSeguro(nextProfile.id),
    ]);
    setSelectedCategories(nextSelectedCategories);
    setServices(nextServices);
    setSchedules(nextSchedules);
  }

  async function handleSaveProfile(payload: { nome_estab: string; documento: string }) {
    setSaving(true);
    setError('');
    try {
      const nextProfile = profile
        ? await atualizarPerfilPrestador(profile.id, payload)
        : await criarPerfilPrestador(payload);
      setProfile(nextProfile);
      setError('');
      setSelectedCategories([]);
      setServices([]);
      setSchedules([]);
      setStep('categorias');
      await reloadProfileData(nextProfile);
    } catch (saveError) {
      setError(getBackendMessage(saveError, 'Nao foi possivel salvar os dados do estabelecimento.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory(categoriaId: number) {
    setSavingCategoryId(categoriaId);
    setError('');
    try {
      await associarMinhasCategoriasPrestador([categoriaId]);
      setSelectedCategories(await listarMinhasCategoriasPrestador());
    } catch (categoryError) {
      setError(getBackendMessage(categoryError, 'Nao foi possivel associar a categoria.'));
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function handleRemoveCategory(categoriaId: number) {
    setSavingCategoryId(categoriaId);
    setError('');
    try {
      await removerMinhaCategoriaPrestador(categoriaId);
      setSelectedCategories(await listarMinhasCategoriasPrestador());
    } catch (categoryError) {
      setError(getBackendMessage(categoryError, 'Nao foi possivel remover a categoria.'));
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function handleCreateService(payload: {
    nome: string;
    preco: number;
    duracao_min: number;
    categoria_id?: number;
  }) {
    if (!profile || !payload.categoria_id) {
      setError('Selecione a categoria do servico.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await criarServicoPrestadorOnboarding(profile.id, {
        nome: payload.nome,
        preco: payload.preco,
        duracao_min: payload.duracao_min,
        categoria_id: payload.categoria_id,
      });
      setServiceModalVisible(false);
      setServices(await listarServicosPrestadorOnboarding(profile.id));
    } catch (serviceError) {
      setError(getBackendMessage(serviceError, 'Nao foi possivel cadastrar o servico.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSchedule(payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await criarHorarioPrestadorOnboarding(profile.id, payload);
      setScheduleModalVisible(false);
      setSchedules(await listarHorariosPrestadorOnboarding(profile.id));
    } catch (scheduleError) {
      setError(getBackendMessage(scheduleError, 'Nao foi possivel cadastrar o horario.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSchedule(horarioId: number) {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await removerHorarioPrestadorOnboarding(profile.id, horarioId);
      setSchedules(await listarHorariosPrestadorOnboarding(profile.id));
    } catch (scheduleError) {
      setError(getBackendMessage(scheduleError, 'Nao foi possivel remover o horario.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!profile) {
      return;
    }

    const errors = getValidationErrors(profile, selectedCategories, services, schedules);
    if (errors.length) {
      setError(errors.join('\n'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const nextProfile = await enviarPrestadorParaAprovacao(profile.id);
      setProfile(nextProfile);
      setShowEditableRejected(false);
      await reloadProfileData(nextProfile);
    } catch (submitError) {
      setError(getBackendMessage(submitError, 'Nao foi possivel enviar para aprovacao.'));
    } finally {
      setSaving(false);
    }
  }

  const validationErrors = useMemo(
    () => getValidationErrors(profile, selectedCategories, services, schedules),
    [profile, selectedCategories, services, schedules]
  );

  if (loading) {
    return <LoadingIndicator text="Carregando cadastro profissional..." />;
  }

  const showStatusOnly =
    profile && (profile.status === 'pendente' || profile.status === 'ativo' || (canEditRejected && !showEditableRejected));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cadastro profissional</Text>
        <Text style={styles.subtitle}>Preencha as etapas para solicitar analise como prestador.</Text>
      </View>

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
        </Card>
      ) : null}

      {showStatusOnly ? (
        <ProviderApplicationStatus profile={profile} onContinue={() => setShowEditableRejected(true)} />
      ) : (
        <>
          <StepSelector activeStep={step} onSelect={setStep} hasProfileId={hasProfileId} />

          {step === 'dados' ? <ProviderDataStep profile={profile} saving={saving} onAdvance={handleSaveProfile} /> : null}

          {step === 'categorias' ? (
            <ProviderCategoriesStep
              categories={categories}
              selectedCategories={selectedCategories}
              disabled={!hasProfileId || !canEdit}
              savingCategoryId={savingCategoryId}
              onAdd={handleAddCategory}
              onRemove={handleRemoveCategory}
            />
          ) : null}

          {step === 'servicos' ? (
            <ProviderServicesStep
              categories={categories}
              services={services}
              modalVisible={serviceModalVisible}
              saving={saving}
              disabled={!hasProfileId || !canEdit}
              onOpenModal={() => setServiceModalVisible(true)}
              onCloseModal={() => setServiceModalVisible(false)}
              onCreateService={handleCreateService}
            />
          ) : null}

          {step === 'horarios' ? (
            <ProviderSchedulesStep
              schedules={schedules}
              modalVisible={scheduleModalVisible}
              saving={saving}
              disabled={!hasProfileId || !canEdit}
              onOpenModal={() => setScheduleModalVisible(true)}
              onCloseModal={() => setScheduleModalVisible(false)}
              onCreateSchedule={handleCreateSchedule}
              onRemoveSchedule={handleRemoveSchedule}
            />
          ) : null}

          {step === 'revisao' ? (
            <ProviderReviewStep
              profile={profile}
              selectedCategories={selectedCategories}
              serviceCategories={categories}
              services={services}
              schedules={schedules}
              saving={saving}
              validationErrors={validationErrors}
              onSubmit={handleSubmit}
            />
          ) : null}

          <NavigationButtons profile={profile} step={step} onStepChange={setStep} />
        </>
      )}
    </ScrollView>
  );
}

function getResumeStep(
  profile: ProviderOnboardingProfile,
  selectedCategories: ProviderCategoryLink[],
  services: ProviderOnboardingService[],
  schedules: ProviderOnboardingSchedule[]
): StepKey {
  if (!profile.nome_estab || !profile.documento) {
    return 'dados';
  }

  if (!selectedCategories.length) {
    return 'categorias';
  }

  if (!services.length || !services.some((service) => service.categoria_id)) {
    return 'servicos';
  }

  if (!schedules.length) {
    return 'horarios';
  }

  return 'revisao';
}

function getValidationErrors(
  profile: ProviderOnboardingProfile | null,
  selectedCategories: ProviderCategoryLink[],
  services: ProviderOnboardingService[],
  schedules: ProviderOnboardingSchedule[]
): string[] {
  const errors: string[] = [];

  if (!profile?.nome_estab || !profile.documento) {
    errors.push('Preencha os dados obrigatorios do estabelecimento.');
  }

  if (!selectedCategories.length) {
    errors.push('Associe ao menos uma categoria ao estabelecimento.');
  }

  if (!services.length || !services.some((service) => service.categoria_id)) {
    errors.push('Cadastre ao menos um servico com categoria.');
  }

  if (!schedules.length) {
    errors.push('Cadastre ao menos um horario de funcionamento.');
  }

  return errors;
}

function StepSelector({
  activeStep,
  hasProfileId,
  onSelect,
}: {
  activeStep: StepKey;
  hasProfileId: boolean;
  onSelect: (step: StepKey) => void;
}) {
  return (
    <View style={styles.stepSelector}>
      {steps.map((item) => {
        const active = activeStep === item.key;
        return (
          <Button
            key={item.key}
            title={item.label}
            size="sm"
            variant={active ? 'primary' : 'outline'}
            disabled={!hasProfileId && item.key !== 'dados'}
            style={styles.stepButton}
            onPress={() => onSelect(item.key)}
          />
        );
      })}
    </View>
  );
}

function NavigationButtons({
  profile,
  step,
  onStepChange,
}: {
  profile: ProviderOnboardingProfile | null;
  step: StepKey;
  onStepChange: (step: StepKey) => void;
}) {
  const currentIndex = steps.findIndex((item) => item.key === step);
  const previousStep = steps[currentIndex - 1]?.key;
  const nextStep = steps[currentIndex + 1]?.key;

  return (
    <View style={styles.navButtons}>
      {previousStep ? (
        <Button title="Voltar" variant="secondary" onPress={() => onStepChange(previousStep)} style={styles.navButton} />
      ) : null}
      {nextStep ? (
        <Button
          title="Avancar"
          disabled={!profile?.id}
          onPress={() => onStepChange(nextStep)}
          style={styles.navButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  stepSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  stepButton: {
    minWidth: 96,
  },
  navButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  navButton: {
    flex: 1,
  },
});
