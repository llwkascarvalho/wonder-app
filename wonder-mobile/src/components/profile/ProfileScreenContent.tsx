import { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';
import { Button } from '../Button';
import { Card } from '../Card';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileInfoCard } from './ProfileInfoCard';

type ProfileScreenContentProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  onSignOut: () => Promise<void>;
};

export function ProfileScreenContent({
  title = 'Perfil', subtitle = 'Informações da sua conta.', children, onSignOut,
}: ProfileScreenContentProps) {
  const { usuario: profile, loading, error, retryProfile, isDemoSession } = useAuth();
  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Tentar novamente" onPress={retryProfile} />
        <Button title="Sair" onPress={onSignOut} variant="outline" />
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={isDemoSession ? undefined : <RefreshControl refreshing={loading} onRefresh={retryProfile} />}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Card style={styles.profileCard}>
        <ProfileAvatar nome={profile.nome} fotoUrl={profile.foto_url} />
        <Text style={styles.profileName}>{profile.nome || 'Nome não informado'}</Text>
        <Text style={styles.profileEmail}>{profile.email || 'E-mail não informado'}</Text>
        <Text style={styles.roleText}>{profile.tipo_usuario}</Text>
        <Text style={styles.subtitle}>Edição de perfil e foto indisponível no momento.</Text>
      </Card>
      <ProfileInfoCard profile={profile} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {children}
      <Button title="Sair" onPress={onSignOut} variant="outline" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background, flexGrow: 1, gap: theme.spacing.md,
    padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, paddingTop: theme.spacing.xxl,
  },
  title: { color: theme.colors.text, fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  profileCard: { alignItems: 'center', gap: theme.spacing.sm },
  profileName: {
    color: theme.colors.text, fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold, textAlign: 'center',
  },
  profileEmail: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, textAlign: 'center' },
  roleText: {
    color: theme.colors.primary, fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold, textTransform: 'capitalize',
  },
  error: { color: theme.colors.error, fontSize: theme.fontSize.sm },
});
