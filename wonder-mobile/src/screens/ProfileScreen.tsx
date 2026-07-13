import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { ProfileStackParamList } from '../navigation/ProfileStack';
import { getBackendMessage, obterMeuPrestador } from '../services/providerOnboarding';
import { theme } from '../styles/theme';
import { ProviderOnboardingProfile } from '../types/providerOnboarding';

type Navigation = NativeStackNavigationProp<ProfileStackParamList, 'ClientProfile'>;

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const { usuario, signOut } = useAuth();
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
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Gerencie suas informações e preferências.</Text>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>W</Text>
        </View>
        <Text style={styles.cardTitle}>Usuário Wonder</Text>
        <Text style={styles.cardText}>{usuario?.email || `ID ${usuario?.id}`}</Text>
        {usuario?.tipo_usuario ? (
          <Text style={styles.roleText}>{usuario.tipo_usuario}</Text>
        ) : null}
      </Card>

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

      <Button title="Sair" onPress={signOut} variant="outline" />
    </View>
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
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  profileCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  roleText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
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
