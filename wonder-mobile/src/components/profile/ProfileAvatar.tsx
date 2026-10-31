import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { getProfilePhoto } from '../../services/profileService';
import { getSession, getSessionVersion, isCurrentSession, subscribeSession } from '../../services/session';
import { theme } from '../../styles/theme';

type ProfileAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  loading?: boolean;
  onPress?: () => void;
  revision?: number;
};

export function ProfileAvatar({ nome, fotoUrl, loading = false, onPress, revision = 0 }: ProfileAvatarProps) {
  const [photoSource, setPhotoSource] = useState<string>();
  useEffect(() => {
    let active = true;
    let localUrl: string | undefined;
    const expected = getSessionVersion();
    function release() {
      if (localUrl && Platform.OS === 'web') URL.revokeObjectURL(localUrl);
      localUrl = undefined;
    }
    setPhotoSource(undefined);
    const unsubscribe = subscribeSession(() => {
      if (!isCurrentSession(expected)) {
        active = false;
        setPhotoSource(undefined);
        release();
      }
    });
    if (fotoUrl && getSession()) {
      getProfilePhoto(fotoUrl).then((uri) => {
        localUrl = uri;
        if (!active || !isCurrentSession(expected)) { release(); return; }
        setPhotoSource(uri);
      }).catch(() => { if (active) setPhotoSource(undefined); });
    }
    return () => { active = false; unsubscribe(); release(); };
  }, [fotoUrl, revision]);
  const initial = nome.trim().slice(0, 1).toUpperCase() || 'W';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.avatar, pressed && styles.pressed, loading && styles.loading]}
    >
      {photoSource ? (
        <Image source={{ uri: photoSource }} style={styles.image} onError={() => setPhotoSource(undefined)} />
      ) : (
        <Text style={styles.initial}>{initial}</Text>
      )}
      {onPress ? <View style={styles.cameraBadge}>
        <MaterialIcons name="photo-camera" color={theme.colors.white} size={18} />
      </View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 64,
    height: 128,
    justifyContent: 'center',
    width: 128,
  },
  image: {
    borderRadius: 64,
    height: 128,
    width: 128,
  },
  initial: {
    color: theme.colors.white,
    fontSize: 48,
    fontWeight: theme.fontWeight.bold,
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.white,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 2,
    bottom: 4,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    width: 36,
  },
  pressed: {
    opacity: 0.86,
  },
  loading: {
    opacity: 0.56,
  },
});
