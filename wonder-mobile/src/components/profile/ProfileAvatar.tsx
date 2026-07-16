import { MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveProfilePhotoUrl } from '../../services/profileService';
import { theme } from '../../styles/theme';

type ProfileAvatarProps = {
  nome: string;
  fotoUrl?: string | null;
  loading?: boolean;
  onPress?: () => void;
};

export function ProfileAvatar({ nome, fotoUrl, loading = false, onPress }: ProfileAvatarProps) {
  const photoSource = resolveProfilePhotoUrl(fotoUrl);
  const initial = nome.trim().slice(0, 1).toUpperCase() || 'W';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.avatar, pressed && styles.pressed, loading && styles.loading]}
    >
      {photoSource ? (
        <Image source={{ uri: photoSource }} style={styles.image} />
      ) : (
        <Text style={styles.initial}>{initial}</Text>
      )}
      <View style={styles.cameraBadge}>
        <MaterialIcons name="photo-camera" color={theme.colors.white} size={18} />
      </View>
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
