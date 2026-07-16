import * as ImagePicker from 'expo-image-picker';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getMyProfile,
  getProfileErrorMessage,
  updateMyProfile,
  uploadMyProfilePhoto,
} from '../../services/profileService';
import { theme } from '../../styles/theme';
import { UserProfile, UserProfileUpdate } from '../../types/profile';
import { Button } from '../Button';
import { Card } from '../Card';
import { LoadingIndicator } from '../LoadingIndicator';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileEditModal } from './ProfileEditModal';
import { ProfileInfoCard } from './ProfileInfoCard';

type ProfileScreenContentProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  onSignOut: () => Promise<void>;
};

export function ProfileScreenContent({
  title = 'Perfil',
  subtitle = 'Gerencie suas informacoes e preferencias.',
  children,
  onSignOut,
}: ProfileScreenContentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setProfile(await getMyProfile());
    } catch (loadError) {
      setError(getProfileErrorMessage(loadError, 'Nao foi possivel carregar seu perfil.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleUpdateProfile(payload: UserProfileUpdate) {
    setSaving(true);
    setError('');
    try {
      setProfile(await updateMyProfile(payload));
      setEditVisible(false);
    } catch (updateError) {
      setError(getProfileErrorMessage(updateError, 'Nao foi possivel atualizar seu perfil.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePhoto() {
    setUploading(true);
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Permita o acesso a galeria para alterar a foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      setProfile(
        await uploadMyProfilePhoto({
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
        })
      );
    } catch (uploadError) {
      setError(getProfileErrorMessage(uploadError, 'Nao foi possivel enviar a foto.'));
    } finally {
      setUploading(false);
    }
  }

  if (loading && !profile) {
    return <LoadingIndicator text="Carregando perfil..." />;
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Tentar novamente" onPress={loadProfile} />
        <Button title="Sair" onPress={onSignOut} variant="outline" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProfile} />}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Card style={styles.profileCard}>
        <ProfileAvatar nome={profile.nome} fotoUrl={profile.foto_url} loading={uploading} onPress={handleChangePhoto} />
        <Text style={styles.profileName}>{profile.nome}</Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
        <Text style={styles.roleText}>{profile.tipo_usuario}</Text>
        <View style={styles.actions}>
          <Button title="Editar perfil" onPress={() => setEditVisible(true)} disabled={saving || uploading} />
          <Button title="Alterar foto" variant="secondary" onPress={handleChangePhoto} loading={uploading} />
        </View>
      </Card>

      <ProfileInfoCard profile={profile} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {children}

      <Button title="Sair" onPress={onSignOut} variant="outline" />

      <ProfileEditModal
        visible={editVisible}
        loading={saving}
        profile={profile}
        onClose={() => setEditVisible(false)}
        onSave={handleUpdateProfile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
  profileName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
  profileEmail: {
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
