import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../Button';
import { customerTheme } from '../../styles/customerTheme';
import { ProviderOnboardingProfile } from '../../types/providerOnboarding';

type ProviderApplicationStatusProps = {
  profile: ProviderOnboardingProfile;
  onContinue?: () => void;
};

export function ProviderApplicationStatus({ profile, onContinue }: ProviderApplicationStatusProps) {
  if (profile.status === 'pendente') {
    if (!profile.enviado_em) {
      return <StatusCard icon="edit-note" tone="warning" title="Cadastro em preenchimento"
        text="Complete os serviços e horários e confirme o envio para iniciar a análise."
        action={onContinue ? { title: 'Continuar cadastro', onPress: onContinue } : undefined} />;
    }
    return <StatusCard icon="schedule" tone="warning" title="Cadastro em análise"
      text="Seu cadastro profissional está em avaliação e não pode ser alterado até a conclusão da análise ou uma solicitação de correção."
      action={onContinue ? { title: 'Visualizar solicitação', onPress: onContinue } : undefined} />;
  }

  if (profile.status === 'ativo') {
    return <StatusCard icon="check-circle" tone="success" title="Cadastro aprovado"
      text="Seu cadastro já foi aprovado. Para acessar o fluxo de prestador, saia e entre novamente no aplicativo." />;
  }

  if (profile.status === 'rejeitado') {
    return <StatusCard icon="error-outline" tone="danger" title="Cadastro rejeitado"
      text={profile.motivo_rejeicao || 'Revise os dados e envie novamente.'}
      action={onContinue ? { title: 'Corrigir cadastro', onPress: onContinue } : undefined} />;
  }

  if (profile.status === 'rascunho') {
    return <StatusCard icon="edit-note" tone="warning" title="Correção solicitada"
      text={profile.motivo_rejeicao || 'Revise os dados antes de enviar novamente.'}
      action={onContinue ? { title: 'Continuar correção', onPress: onContinue } : undefined} />;
  }

  if (profile.status === 'suspenso') {
    return <StatusCard icon="block" tone="danger" title="Cadastro suspenso"
      text="Este cadastro precisa ser reativado pelo administrador antes de novas alterações." />;
  }

  return null;
}

type StatusCardProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  tone: 'success' | 'warning' | 'danger';
  title: string;
  text: string;
  action?: { title: string; onPress: () => void };
};

function StatusCard({ icon, tone, title, text, action }: StatusCardProps) {
  const palette = statusPalette[tone];
  return (
    <View style={styles.card}>
      <View style={[styles.statusIcon, { backgroundColor: palette.background }]}>
        <MaterialIcons name={icon} size={24} color={palette.foreground} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      {action ? <Button appearance="customer" title={action.title} onPress={action.onPress} /> : null}
    </View>
  );
}

const statusPalette = {
  success: { background: '#DDF3E8', foreground: '#17805A' },
  warning: { background: '#FFF0C7', foreground: '#9A6700' },
  danger: { background: '#FDE3E5', foreground: '#C62828' },
} as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    gap: 16, padding: 20, ...customerTheme.shadow,
  },
  statusIcon: { alignItems: 'center', borderRadius: 18, height: 56, justifyContent: 'center', width: 56 },
  content: { gap: 5 },
  title: {
    color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 22,
  },
  text: {
    color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 16, lineHeight: 23,
  },
});
