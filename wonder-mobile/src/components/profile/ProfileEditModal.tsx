import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { theme } from '../../styles/theme';
import { customerTheme } from '../../styles/customerTheme';
import { ProfilePhotoAsset, UserProfile, UserProfileUpdate } from '../../types/profile';
import { getProfileErrorMessage, validateProfilePhoto } from '../../services/profileService';
import { Button } from '../Button';
import { Input } from '../Input';

type ProfileEditModalProps = {
  visible: boolean;
  loading?: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (payload: UserProfileUpdate) => Promise<void>;
  appearance?: 'default' | 'customer';
};

export function ProfileEditModal({
  visible, loading = false, profile, onClose, onSave, appearance = 'default',
}: ProfileEditModalProps) {
  const [telefone, setTelefone] = useState(profile.telefone || '');
  const [nome, setNome] = useState(profile.primeiroNome || '');
  const [sobrenome, setSobrenome] = useState(profile.sobrenome || '');
  const [email, setEmail] = useState(profile.email || '');
  const [foto, setFoto] = useState<ProfilePhotoAsset>();
  const [picking, setPicking] = useState(false);
  const busy = useRef(false);
  const pickerRequest = useRef(0);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (visible) {
      setTelefone(profile.telefone || '');
      setNome(profile.primeiroNome || '');
      setSobrenome(profile.sobrenome || '');
      setEmail(profile.email || '');
      setFoto(undefined);
      setError('');
    }
    return () => { pickerRequest.current += 1; };
  }, [visible]);

  const phoneChanged = Boolean(telefone.trim()) && telefone !== (profile.telefone || '');
  const identityChanged = nome.trim() !== (profile.primeiroNome || '') ||
    sobrenome.trim() !== (profile.sobrenome || '') || email.trim() !== (profile.email || '');

  async function selectPhoto() {
    if (busy.current || loading || picking) return;
    const request = ++pickerRequest.current;
    setPicking(true);
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (request !== pickerRequest.current) return;
        if (!permission.granted) {
          setError('Permita o acesso à galeria nas configurações para selecionar uma foto.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (request !== pickerRequest.current || result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      validateProfilePhoto(asset);
      setFoto(asset);
    } catch (err) {
      if (request === pickerRequest.current) {
        setError(getProfileErrorMessage(err, 'Não foi possível selecionar a foto. Tente novamente.'));
      }
    } finally {
      setPicking(false);
    }
  }

  async function handleSave() {
    if (busy.current || loading || picking || (!phoneChanged && !foto && !identityChanged)) return;
    busy.current = true;
    setError('');
    try {
      if (identityChanged && (!nome.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
        throw new Error('Informe um nome e um e-mail válidos.');
      }
      await onSave({ telefone: phoneChanged ? telefone : undefined, foto,
        identidade: identityChanged ? { nome: nome.trim(), sobrenome: sobrenome.trim(), email: email.trim() } : undefined });
    } catch (err) {
      setError(getProfileErrorMessage(err, 'Não foi possível atualizar o perfil. Verifique a conexão e tente novamente.'));
    } finally {
      busy.current = false;
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => { if (!loading && !busy.current) onClose(); }}>
      <View style={[styles.overlay, appearance === 'customer' && styles.customerOverlay]}>
        <View style={[styles.content, appearance === 'customer' && styles.customerContent]}>
          {appearance === 'customer' && width < 640 ? <View style={styles.handle} /> : null}
          <ScrollView contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, appearance === 'customer' && styles.customerTitle]}>Editar perfil</Text>
            {appearance === 'customer' ? (
              <Text style={styles.customerSubtitle}>Atualize seus dados pessoais ou escolha uma nova foto.</Text>
            ) : null}
            <Input label="Nome" value={nome} onChangeText={setNome} maxLength={255} editable={!loading} />
            <Input label="Sobrenome" value={sobrenome} onChangeText={setSobrenome} maxLength={255} editable={!loading} />
            <Input label="E-mail" value={email} onChangeText={setEmail} maxLength={254}
              keyboardType="email-address" autoCapitalize="none" editable={!loading} />
            <Input
              label="Telefone"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              maxLength={20}
              editable={!loading}
              placeholder="(00) 00000-0000"
            />
            <Text style={appearance === 'customer' ? styles.customerHelper : undefined}>
              Deixe o telefone em branco para manter o atual.
            </Text>
            <Button title={foto ? 'Trocar foto selecionada' : 'Selecionar foto'} variant="secondary" onPress={selectPhoto} loading={picking} disabled={loading} />
            <Text style={appearance === 'customer' ? styles.customerHelper : undefined}>
              {foto ? `Foto selecionada: ${foto.fileName || 'imagem'}` : 'JPEG, PNG ou WebP de até 5 MiB.'}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} />
              <Button title="Salvar" onPress={handleSave} loading={loading} disabled={picking || (!phoneChanged && !foto && !identityChanged)} />
            </View>
            </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
    maxWidth: 420,
    padding: theme.spacing.lg,
    width: '100%',
    maxHeight: '90%',
  },
  fields: { gap: theme.spacing.md },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  customerOverlay: { backgroundColor: 'rgba(46, 10, 87, 0.62)', justifyContent: 'flex-end', padding: 0 },
  customerContent: {
    alignSelf: 'center', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    gap: 14, maxHeight: '90%', maxWidth: 560, padding: 20, width: '100%',
    ...customerTheme.shadow,
  },
  handle: { alignSelf: 'center', backgroundColor: customerTheme.v4.border, borderRadius: 3, height: 5, marginBottom: 2, width: 44 },
  customerTitle: {
    color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 26, lineHeight: 30, textAlign: 'left',
  },
  customerSubtitle: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 16, lineHeight: 22 },
  customerHelper: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 14, lineHeight: 20 },
});
