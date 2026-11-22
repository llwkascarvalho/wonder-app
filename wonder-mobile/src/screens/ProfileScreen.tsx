import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const providerNotice = error ? null : getProviderNotice(providerProfile);
  const handleProviderAction = error
    ? loadProviderProfile
    : () => navigation.navigate('ProviderOnboarding');

  return (
    <ProfileScreenContent appearance="customer" title="Meu perfil" subtitle="Gerencie seus dados pessoais." onSignOut={signOut}>
      <View style={styles.providerCard}>
        <View style={styles.providerHeading}>
          <View style={styles.providerIcon}><MaterialIcons name="storefront" size={26} color={customerTheme.v4.primary} /></View>
          <View style={styles.providerHeadingText}>
            <Text style={styles.providerTitle}>Prestador Wonder</Text>
            <Text style={styles.providerCaption}>Ofereça seus serviços na plataforma</Text>
          </View>
        </View>
        {providerNotice ? <View accessibilityRole="summary" style={[styles.notice, styles[providerNotice.tone]]}>
          <MaterialIcons name={providerNotice.icon} size={21} color={providerNotice.color} />
          <View style={styles.noticeText}>
            <Text style={[styles.noticeTitle, { color: providerNotice.color }]}>{providerNotice.title}</Text>
            <Text style={styles.noticeDescription}>{providerNotice.description}</Text>
            {providerNotice.reason ? <Text style={styles.noticeReason}>Motivo: {providerNotice.reason}</Text> : null}
          </View>
        </View> : null}
        {error ? <View accessibilityRole="alert" style={[styles.notice, styles.danger]}>
          <MaterialIcons name="error-outline" size={21} color={customerTheme.v4.danger} />
          <Text style={[styles.noticeDescription, styles.noticeText]}>{error}</Text>
        </View> : null}
        <Pressable accessibilityRole="button" disabled={loadingProviderProfile} onPress={handleProviderAction}
          style={[styles.providerAction, !error && providerProfile?.status === 'pendente' && Boolean(providerProfile.enviado_em) && styles.providerActionSecondary, loadingProviderProfile && styles.disabled]}>
          <Text style={[styles.providerActionText, !error && providerProfile?.status === 'pendente' && Boolean(providerProfile.enviado_em) && styles.providerActionTextSecondary]}>{loadingProviderProfile ? 'Carregando...' : error ? 'Tentar novamente' : providerButtonTitle}</Text>
        </Pressable>
      </View>
    </ProfileScreenContent>
  );
}

type ProviderNotice = {
  tone: 'warning' | 'danger' | 'success';
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  title: string;
  description: string;
  reason?: string | null;
};

function getProviderNotice(profile: ProviderOnboardingProfile | null): ProviderNotice | null {
  if (!profile) return null;
  if (profile.status === 'pendente' && !profile.enviado_em) {
    return { tone: 'warning', icon: 'edit-note', color: '#9A5200', title: 'Cadastro em preenchimento', description: 'Complete os serviços e horários antes de enviar para análise.' };
  }
  if (profile.status === 'pendente') return { tone: 'warning', icon: 'schedule', color: '#9A5200', title: 'Em análise', description: 'Você será avisado quando houver uma decisão.' };
  if (profile.status === 'rejeitado') return { tone: 'danger', icon: 'error-outline', color: customerTheme.v4.danger, title: 'Cadastro rejeitado', description: 'Revise o motivo informado e envie novamente.', reason: profile.motivo_rejeicao };
  if (profile.status === 'rascunho') return profile.motivo_rejeicao
    ? { tone: 'warning', icon: 'edit-note', color: '#9A5200', title: 'Correção solicitada', description: 'Revise seu cadastro antes de reenviar para análise.', reason: profile.motivo_rejeicao }
    : { tone: 'warning', icon: 'edit-note', color: '#9A5200', title: 'Cadastro em preenchimento', description: 'Complete os serviços e horários antes de enviar para análise.' };
  if (profile.status === 'ativo') return { tone: 'success', icon: 'check-circle-outline', color: customerTheme.v4.success, title: 'Cadastro aprovado', description: 'Seu cadastro profissional está ativo.' };
  if (profile.status === 'suspenso') return { tone: 'danger', icon: 'block', color: customerTheme.v4.danger, title: 'Cadastro suspenso', description: 'Aguarde a reativação pelo administrador.' };
  return null;
}

function getProviderButtonTitle(profile: ProviderOnboardingProfile | null): string {
  if (!profile) {
    return 'Quero ser prestador';
  }

  if (profile.status === 'rascunho') {
    return profile.motivo_rejeicao ? 'Continuar correção' : 'Continuar cadastro profissional';
  }

  if (profile.status === 'suspenso') {
    return 'Ver cadastro';
  }

  if (profile.status === 'pendente') {
    return profile.enviado_em ? 'Visualizar solicitação' : 'Continuar cadastro profissional';
  }

  if (profile.status === 'rejeitado') {
    return 'Corrigir cadastro';
  }

  if (profile.status === 'ativo') {
    return 'Ver cadastro';
  }

  return 'Continuar cadastro profissional';
}

const styles = StyleSheet.create({
  providerCard: {
    backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    gap: 14, padding: 16, ...customerTheme.shadow,
  },
  providerHeading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  providerHeadingText: { flex: 1, gap: 2 },
  providerIcon: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  providerTitle: {
    color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 19,
  },
  providerCaption: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  notice: { alignItems: 'flex-start', borderRadius: 16, flexDirection: 'row', gap: 12, padding: 14 },
  warning: { backgroundColor: '#FFF0D6' },
  danger: { backgroundColor: '#FDE7EA' },
  success: { backgroundColor: '#DDF3E8' },
  noticeText: { flex: 1, gap: 3 },
  noticeTitle: { fontFamily: customerTheme.v4.fontBodyBold, fontSize: 15, lineHeight: 20 },
  noticeDescription: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 19 },
  noticeReason: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 14, lineHeight: 19 },
  providerAction: { alignItems: 'center', backgroundColor: customerTheme.v4.primary, borderRadius: 28, height: 52, justifyContent: 'center' },
  providerActionSecondary: { backgroundColor: customerTheme.v4.lilac },
  providerActionText: { color: '#FFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
  providerActionTextSecondary: { color: customerTheme.v4.primary },
  disabled: { opacity: 0.55 },
});
