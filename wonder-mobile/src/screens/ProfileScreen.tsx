import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ProfileScreenContent } from '../components/profile/ProfileScreenContent';
import { useAuth } from '../contexts/AuthContext';
import { ProfileStackParamList } from '../navigation/ProfileStack';
import { getBackendMessage, obterMeuPrestador } from '../services/providerOnboarding';
import { customerTheme } from '../styles/customerTheme';
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
    <ProfileScreenContent appearance="customer" title="Meu perfil" subtitle="Gerencie seus dados pessoais." onSignOut={signOut}>
      <View style={styles.providerCard}>
        <View style={styles.providerHeading}>
          <View style={styles.providerIcon}><MaterialIcons name="storefront" size={22} color={customerTheme.colors.brandDark} /></View>
          <View style={styles.providerHeadingText}>
            <Text style={styles.providerTitle}>Prestador Wonder</Text>
            <Text style={styles.providerCaption}>Ofereça seus serviços na plataforma</Text>
          </View>
        </View>
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
      </View>
    </ProfileScreenContent>
  );
}

function getProviderMessage(profile: ProviderOnboardingProfile | null): string {
  if (!profile) return 'Cadastre seu estabelecimento para oferecer serviços na plataforma.';
  if (profile.status === 'pendente' && !profile.enviado_em) {
    return 'Seu cadastro ainda não foi enviado. Complete os serviços e horários para finalizar.';
  }
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
    return profile.enviado_em ? 'Visualizar solicitação' : 'Continuar cadastro profissional';
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
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    gap: 12, padding: 18, ...customerTheme.shadow,
  },
  providerHeading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  providerHeadingText: { flex: 1, gap: 2 },
  providerIcon: { alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  providerTitle: {
    color: customerTheme.colors.text, fontSize: 16, fontWeight: '800',
  },
  providerCaption: { color: customerTheme.colors.textSecondary, fontSize: 11 },
  providerText: {
    color: customerTheme.colors.textSecondary, fontSize: 13, lineHeight: 19,
  },
  error: {
    color: customerTheme.colors.danger, fontSize: 12,
  },
  providerWarning: {
    color: '#9A6700', fontSize: 13, fontWeight: '600', lineHeight: 19,
  },
});
