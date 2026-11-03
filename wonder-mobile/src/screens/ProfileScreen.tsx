import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ProfileScreenContent } from '../components/profile/ProfileScreenContent';
import { useAuth } from '../contexts/AuthContext';
import { ProfileStackParamList } from '../navigation/ProfileStack';
import { getBackendMessage, obterMeuPrestador } from '../services/providerOnboarding';
import { theme } from '../styles/theme';
import { ProviderOnboardingProfile } from '../types/providerOnboarding';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'ClientProfile'>;

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const { signOut } = useAuth();
  const [providerProfile, setProviderProfile] = useState<ProviderOnboardingProfile | null>(null);
  const [loadingProviderProfile, setLoadingProviderProfile] = useState(false);
  const [error, setError] = useState('');

  const loadProviderProfile = useCallback(async () => {
    setLoadingProviderProfile(true);
    setError('');
    try {
      setProviderProfile(await obterMeuPrestador());
    } catch (loadError) {
      setError(getBackendMessage(loadError, 'Nao foi possivel verificar seu cadastro profissional.'));
    } finally {
      setLoadingProviderProfile(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProviderProfile();
    }, [loadProviderProfile])
  );

  const providerButtonTitle = getProviderButtonTitle(providerProfile);
  const providerMessage = getProviderMessage(providerProfile);
  const handleProviderAction = error
    ? loadProviderProfile
    : () => navigation.navigate('ProviderOnboarding');

  return (
    <ProfileScreenContent onSignOut={signOut}>
      <Card style={styles.providerCard}>
        <Text style={styles.providerTitle}>Prestador Wonder</Text>
        <Text style={providerProfile?.status === 'rejeitado' || providerProfile?.status === 'rascunho'
          ? styles.providerWarning : styles.providerText}>{providerMessage}</Text>
        {providerProfile?.motivo_rejeicao ? (
          <Text accessibilityRole="alert" style={styles.providerWarning}>Motivo: {providerProfile.motivo_rejeicao}</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={error ? 'Tentar novamente' : providerButtonTitle}
          loading={loadingProviderProfile}
          disabled={loadingProviderProfile}
          onPress={handleProviderAction}
        />
      </Card>
    </ProfileScreenContent>
  );
}

function getProviderMessage(profile: ProviderOnboardingProfile | null): string {
  if (!profile) return 'Cadastre seu estabelecimento para oferecer serviços na plataforma.';
  if (profile.status === 'pendente') return 'Seu cadastro foi enviado e está aguardando análise do administrador.';
  if (profile.status === 'rejeitado') return 'Seu cadastro foi rejeitado. Revise o motivo informado e envie novamente.';
  if (profile.status === 'rascunho') return profile.motivo_rejeicao
    ? 'O administrador solicitou correções no seu cadastro.'
    : 'Seu cadastro ainda não foi enviado. Continue para cadastrar serviços e horários.';
  if (profile.status === 'ativo') return 'Seu cadastro profissional está aprovado e ativo.';
  if (profile.status === 'suspenso') return 'Seu cadastro profissional está suspenso.';
  return 'Acompanhe aqui seu cadastro profissional.';
}

function getProviderButtonTitle(profile: ProviderOnboardingProfile | null): string {
  if (!profile) {
    return 'Quero oferecer meus servicos';
  }

  if (profile.status === 'rascunho' || profile.status === 'suspenso') {
    return 'Continuar cadastro profissional';
  }

  if (profile.status === 'pendente') {
    return 'Cadastro em analise';
  }

  if (profile.status === 'rejeitado') {
    return 'Corrigir cadastro';
  }

  if (profile.status === 'ativo') {
    return 'Cadastro aprovado';
  }

  return 'Continuar cadastro profissional';
}

const styles = StyleSheet.create({
  providerCard: {
    gap: theme.spacing.sm,
  },
  providerTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  providerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  providerWarning: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    lineHeight: 22,
  },
});
