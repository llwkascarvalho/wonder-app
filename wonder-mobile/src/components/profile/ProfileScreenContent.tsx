import { ReactNode, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';
import { customerTheme } from '../../styles/customerTheme';
import { Button } from '../Button';
import { Card } from '../Card';
import { HeroGlows } from '../customer/HeroGlows';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileInfoCard } from './ProfileInfoCard';
import { ProfileEditModal } from './ProfileEditModal';
import type { UserProfileUpdate } from '../../types/profile';
import { useResetScrollOnFocus } from '../../navigation/useResetScrollOnFocus';

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
  const scrollRef = useRef<ScrollView>(null);
  useResetScrollOnFocus(scrollRef);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

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
          ref={scrollRef}
          contentContainerStyle={customerStyles.scroll}
          refreshControl={isDemoSession ? undefined : <RefreshControl refreshing={loading} onRefresh={retryProfile} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={[customerStyles.hero, { paddingTop: desktop ? 44 : Math.max(insets.top, 56), paddingHorizontal: desktop ? 76 : 20 }]}>
            <HeroGlows desktop={desktop} />
            <Text style={customerStyles.title}>{title}</Text>
            <Text style={customerStyles.subtitle}>{subtitle}</Text>
          </View>
          <View style={[customerStyles.sheet, desktop && customerStyles.sheetDesktop]}>
          <View style={[customerStyles.container, desktop && customerStyles.containerDesktop]}>
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
          <Pressable accessibilityRole="button" onPress={onSignOut} style={customerStyles.signOut}>
            <Text style={customerStyles.signOutText}>Sair da conta</Text>
          </Pressable>
          </View>
          </View>
        </ScrollView>
      </View>
    );
  }
  return (
    <ScrollView
      ref={scrollRef}
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
      <View style={customerStyles.infoIcon}><MaterialIcons name={label === 'Telefone' ? 'phone' : label === 'E-mail' ? 'email' : 'person-outline'} size={22} color={customerTheme.v4.primary} /></View>
      <View style={customerStyles.infoBody}><Text style={customerStyles.infoLabel}>{label}</Text>
      <Text style={customerStyles.infoValue} numberOfLines={2}>{value}</Text></View>
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
  screen: { backgroundColor: customerTheme.v4.bg, flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: customerTheme.v4.primary, minHeight: 176, overflow: 'hidden', paddingBottom: 56 },
  sheet: { backgroundColor: customerTheme.v4.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, marginTop: -28, paddingTop: 20 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingTop: 40 },
  container: {
    alignSelf: 'center', flexGrow: 1, gap: 14, maxWidth: 560, paddingBottom: 150,
    paddingHorizontal: 20, width: '100%',
  },
  containerDesktop: { maxWidth: 880, paddingBottom: 72 },
  errorState: { alignSelf: 'center', flex: 1, gap: 16, maxWidth: 560, paddingHorizontal: 20, width: '100%' },
  title: { color: '#FFF', fontFamily: customerTheme.v4.fontDisplay, fontSize: 34, lineHeight: 38 },
  subtitle: { color: '#FFF', fontFamily: customerTheme.v4.fontBody, fontSize: 17, marginTop: 6 },
  summaryCard: {
    alignItems: 'center', backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    flexDirection: 'row', gap: 14, minHeight: 108, padding: 16, ...customerTheme.shadow,
  },
  summaryText: { flex: 1, gap: 3, minWidth: 0 },
  profileName: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 22, lineHeight: 26 },
  profileEmail: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15, lineHeight: 20 },
  badges: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 1 },
  roleBadge: { backgroundColor: customerTheme.v4.lilac, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  roleBadgeText: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 13, textTransform: 'capitalize' },
  editButton: {
    alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 999, height: 44,
    justifyContent: 'center', width: 44,
  },
  pressed: { opacity: 0.82 },
  infoCard: {
    backgroundColor: customerTheme.v4.surface, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 4, ...customerTheme.shadow,
  },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 68 },
  infoIcon: { alignItems: 'center', backgroundColor: customerTheme.v4.lilac, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  infoBody: { flex: 1, gap: 2 },
  infoLabel: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  infoValue: {
    color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16,
  },
  error: { color: customerTheme.colors.danger, fontSize: 12, lineHeight: 17 },
  signOut: { alignItems: 'center', backgroundColor: '#FDE3E5', borderRadius: 28, height: 52, justifyContent: 'center' },
  signOutText: { color: customerTheme.v4.danger, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16 },
});
