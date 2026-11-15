import { ReactNode, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';
import { customerTheme } from '../../styles/customerTheme';
import { Button } from '../Button';
import { Card } from '../Card';
import { CustomerHeader } from '../customer/CustomerHeader';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileInfoCard } from './ProfileInfoCard';
import { ProfileEditModal } from './ProfileEditModal';
import type { UserProfileUpdate } from '../../types/profile';

type ProfileScreenContentProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  onSignOut: () => Promise<void>;
  appearance?: 'default' | 'customer';
};

export function ProfileScreenContent({
  title = 'Perfil', subtitle = 'Informações da sua conta.', children, onSignOut, appearance = 'default',
}: ProfileScreenContentProps) {
  const { usuario: profile, loading, error, retryProfile, isDemoSession, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoRevision, setPhotoRevision] = useState(0);
  const savingRef = useRef(false);
  const insets = useSafeAreaInsets();

  async function handleSave(payload: UserProfileUpdate) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await updateProfile(payload);
      if (payload.foto) setPhotoRevision((value) => value + 1);
      setEditing(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  if (!profile) {
    if (appearance === 'customer') {
      return (
        <View style={customerStyles.screen}>
          <View style={[customerStyles.errorState, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
            <Text style={customerStyles.title}>{title}</Text>
            {error ? <Text style={customerStyles.error}>{error}</Text> : null}
            <Button title="Tentar novamente" onPress={retryProfile} />
            <Button title="Sair" onPress={onSignOut} variant="danger" />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Tentar novamente" onPress={retryProfile} />
        <Button title="Sair" onPress={onSignOut} variant="outline" />
      </View>
    );
  }
  if (appearance === 'customer') {
    return (
      <View style={customerStyles.screen}>
        <ScrollView
          contentContainerStyle={[
            customerStyles.container,
            { paddingTop: Math.max(insets.top, 20) + 6 },
          ]}
          refreshControl={isDemoSession ? undefined : <RefreshControl refreshing={loading} onRefresh={retryProfile} />}
          showsVerticalScrollIndicator={false}
        >
          <CustomerHeader onSignOut={onSignOut} />
          <View style={customerStyles.intro}>
            <Text style={customerStyles.title}>{title}</Text>
            <Text style={customerStyles.subtitle}>{subtitle}</Text>
          </View>
          <View style={customerStyles.summaryCard}>
            <ProfileAvatar
              nome={profile.nome}
              fotoUrl={isDemoSession ? null : profile.foto_url}
              revision={photoRevision}
              size={72}
            />
            <View style={customerStyles.summaryText}>
              <Text style={customerStyles.profileName} numberOfLines={1}>{profile.nome || 'Nome não informado'}</Text>
              <Text style={customerStyles.profileEmail} numberOfLines={1}>{profile.email || 'E-mail não informado'}</Text>
              <View style={customerStyles.badges}>
                <View style={customerStyles.roleBadge}><Text style={customerStyles.roleBadgeText}>{profile.tipo_usuario}</Text></View>
              </View>
            </View>
            {!isDemoSession ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar perfil"
                onPress={() => setEditing(true)}
                style={({ pressed }) => [customerStyles.editButton, pressed && customerStyles.pressed]}
              >
                <MaterialIcons name="edit" color={customerTheme.colors.brandDark} size={16} />
              </Pressable>
            ) : null}
          </View>
          <View style={customerStyles.infoCard}>
            <CustomerInfoRow label="Nome" value={profile.nome || 'Não informado'} />
            <CustomerInfoRow label="E-mail" value={profile.email || 'Não informado'} />
            <CustomerInfoRow label="Telefone" value={profile.telefone || 'Não informado'} />
          </View>
          {!isDemoSession ? (
            <ProfileEditModal
              visible={editing}
              profile={profile}
              loading={saving}
              appearance="customer"
              onClose={() => setEditing(false)}
              onSave={handleSave}
            />
          ) : null}
          {error ? <Text style={customerStyles.error}>{error}</Text> : null}
          {children}
        </ScrollView>
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
        <ProfileAvatar nome={profile.nome} fotoUrl={isDemoSession ? null : profile.foto_url} revision={photoRevision} />
        <Text style={styles.profileName}>{profile.nome || 'Nome não informado'}</Text>
        <Text style={styles.profileEmail}>{profile.email || 'E-mail não informado'}</Text>
        <Text style={styles.roleText}>{profile.tipo_usuario}</Text>
        {!isDemoSession ? <Button title="Editar perfil" onPress={() => setEditing(true)} /> : null}
      </Card>
      <ProfileInfoCard profile={profile} />
      {!isDemoSession ? <ProfileEditModal visible={editing} profile={profile} loading={saving} onClose={() => setEditing(false)} onSave={handleSave} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {children}
      <Button title="Sair" onPress={onSignOut} variant="outline" />
    </ScrollView>
  );
}

function CustomerInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={customerStyles.infoRow}>
      <Text style={customerStyles.infoLabel}>{label}</Text>
      <Text style={customerStyles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
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

const customerStyles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.colors.background, flex: 1 },
  container: {
    alignSelf: 'center', flexGrow: 1, gap: 12, maxWidth: 560, paddingBottom: 110,
    paddingHorizontal: 20, width: '100%',
  },
  errorState: { alignSelf: 'center', flex: 1, gap: 16, maxWidth: 560, paddingHorizontal: 20, width: '100%' },
  intro: { gap: 2, marginBottom: 8, marginTop: 2 },
  title: { color: customerTheme.colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: customerTheme.colors.textSecondary, fontSize: 13 },
  summaryCard: {
    alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    flexDirection: 'row', gap: 14, minHeight: 108, padding: 16, ...customerTheme.shadow,
  },
  summaryText: { flex: 1, gap: 3, minWidth: 0 },
  profileName: { color: customerTheme.colors.text, fontSize: 16, fontWeight: '600', lineHeight: 21 },
  profileEmail: { color: customerTheme.colors.textSecondary, fontSize: 12, lineHeight: 16 },
  badges: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 1 },
  roleBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
  roleBadgeText: { color: '#8846E6', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  editButton: {
    alignItems: 'center', backgroundColor: '#EFE3FA', borderRadius: 999, height: 36,
    justifyContent: 'center', width: 36,
  },
  pressed: { opacity: 0.82 },
  infoCard: {
    backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card,
    paddingHorizontal: 14, paddingVertical: 6, ...customerTheme.shadow,
  },
  infoRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  infoLabel: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  infoValue: {
    color: customerTheme.colors.text, flex: 1, fontSize: 13, fontWeight: '600',
    marginLeft: 16, textAlign: 'right',
  },
  error: { color: customerTheme.colors.danger, fontSize: 12, lineHeight: 17 },
});
