import { StyleSheet, Text } from 'react-native';

import { Button } from '../Button';
import { Card } from '../Card';
import { theme } from '../../styles/theme';
import { ProviderOnboardingProfile } from '../../types/providerOnboarding';

type ProviderApplicationStatusProps = {
  profile: ProviderOnboardingProfile;
  onContinue?: () => void;
};

export function ProviderApplicationStatus({ profile, onContinue }: ProviderApplicationStatusProps) {
  if (profile.status === 'pendente') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Cadastro em análise</Text>
        <Text style={styles.text}>
          Seu cadastro profissional foi enviado para avaliação. A edição fica indisponível enquanto a análise estiver pendente.
        </Text>
      </Card>
    );
  }

  if (profile.status === 'ativo') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Cadastro aprovado</Text>
        <Text style={styles.text}>
          Seu cadastro já foi aprovado. Para acessar o fluxo de prestador, saia e entre novamente no aplicativo.
        </Text>
      </Card>
    );
  }

  if (profile.status === 'rejeitado') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Cadastro rejeitado</Text>
        <Text style={styles.text}>{profile.motivo_rejeicao || 'Revise os dados e envie novamente.'}</Text>
        {onContinue ? <Button title="Corrigir cadastro" onPress={onContinue} /> : null}
      </Card>
    );
  }

  if (profile.status === 'suspenso') {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Cadastro suspenso</Text>
        <Text style={styles.text}>Este cadastro esta suspenso. Revise os dados antes de reenviar.</Text>
        {onContinue ? <Button title="Revisar cadastro" onPress={onContinue} /> : null}
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    lineHeight: 22,
  },
});
