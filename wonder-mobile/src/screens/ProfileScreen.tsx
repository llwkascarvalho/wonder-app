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

  return (
    <ProfileScreenContent onSignOut={signOut}>
      <Card style={styles.providerCard}>
        <Text style={styles.providerTitle}>Prestador Wonder</Text>
        <Text style={styles.providerText}>Cadastre seu estabelecimento para oferecer servicos na plataforma.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={providerButtonTitle}
          loading={loadingProviderProfile}
          onPress={() => navigation.navigate('ProviderOnboarding')}
        />
      </Card>
    </ProfileScreenContent>
  );
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
});
