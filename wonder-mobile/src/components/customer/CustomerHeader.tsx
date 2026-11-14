import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { getProfilePhoto } from '../../services/profileService';
import { customerTheme } from '../../styles/customerTheme';

export function CustomerHeader() {
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
});
