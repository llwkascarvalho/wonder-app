import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { getProfilePhoto } from '../../services/profileService';
import { customerTheme } from '../../styles/customerTheme';

type CustomerHeaderProps = {
  onSignOut?: () => void | Promise<void>;
};

export function CustomerHeader({ onSignOut }: CustomerHeaderProps) {
  const { usuario } = useAuth();
  const [photo, setPhoto] = useState<string>();
  const name = usuario?.nome?.trim() || 'Cliente';
  const firstName = name.split(/\s+/)[0];

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setPhoto(undefined);
    if (!usuario?.foto_url) return () => { active = false; };
    getProfilePhoto(usuario.foto_url).then((uri) => {
      objectUrl = uri;
      if (active) setPhoto(uri);
    }).catch(() => undefined);
    return () => {
      active = false;
      if (Platform.OS === 'web' && objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [usuario?.foto_url]);

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          {photo ? <Image source={{ uri: photo }} style={styles.avatarImage} />
            : <Text style={styles.initial}>{name.slice(0, 1).toUpperCase()}</Text>}
        </View>
        <View>
          <Text style={styles.greeting}>Olá, {firstName}!</Text>
          <Text style={styles.role}>Cliente Wonder</Text>
        </View>
      </View>
      {onSignOut ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
          onPress={onSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <MaterialIcons name="logout" color={customerTheme.colors.danger} size={18} />
          <Text style={styles.signOutText}>Sair</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  identity: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: {
    alignItems: 'center', backgroundColor: customerTheme.colors.brandDark, borderRadius: 20,
    height: 40, justifyContent: 'center', overflow: 'hidden', width: 40,
  },
  avatarImage: { height: 40, width: 40 },
  initial: { color: customerTheme.colors.textOnBrand, fontSize: 16, fontWeight: '700' },
  greeting: { color: customerTheme.colors.text, fontSize: 16, fontWeight: '700' },
  role: { color: customerTheme.colors.textSecondary, fontSize: 11 },
  signOut: {
    alignItems: 'center', backgroundColor: customerTheme.colors.dangerSurface, borderRadius: 999,
    flexDirection: 'row', gap: 6, height: 40, justifyContent: 'center', paddingHorizontal: 12,
  },
  signOutText: { color: customerTheme.colors.danger, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.82 },
});
