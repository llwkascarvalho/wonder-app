import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../styles/theme';
import { UserProfile } from '../../types/profile';
import { Card } from '../Card';

type ProfileInfoCardProps = {
  profile: UserProfile;
};

export function ProfileInfoCard({ profile }: ProfileInfoCardProps) {
  return (
    <Card style={styles.card}>
      <InfoRow label="Nome" value={profile.nome} />
      <InfoRow label="Email" value={profile.email} />
      <InfoRow label="Telefone" value={profile.telefone || 'Nao informado'} />
      <InfoRow label="Tipo de usuario" value={profile.tipo_usuario} />
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
  },
  infoRow: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  infoLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  infoValue: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
});
