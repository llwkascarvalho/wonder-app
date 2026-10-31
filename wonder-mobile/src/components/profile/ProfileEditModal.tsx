import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../styles/theme';
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
};

export function ProfileEditModal({ visible, loading = false, profile, onClose, onSave }: ProfileEditModalProps) {
  const [telefone, setTelefone] = useState(profile.telefone || '');
  const [foto, setFoto] = useState<ProfilePhotoAsset>();
  const [picking, setPicking] = useState(false);
  const busy = useRef(false);
  const pickerRequest = useRef(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setTelefone(profile.telefone || '');
      setFoto(undefined);
      setError('');
    }
    return () => { pickerRequest.current += 1; };
  }, [visible]);

  const phoneChanged = Boolean(telefone.trim()) && telefone !== (profile.telefone || '');

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
    if (busy.current || loading || picking || (!phoneChanged && !foto)) return;
    busy.current = true;
    setError('');
    try {
      await onSave({ telefone: phoneChanged ? telefone : undefined, foto });
    } catch (err) {
      setError(getProfileErrorMessage(err, 'Não foi possível atualizar o perfil. Verifique a conexão e tente novamente.'));
    } finally {
      busy.current = false;
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => { if (!loading && !busy.current) onClose(); }}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Editar perfil</Text>
          <Input
            label="Telefone"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            maxLength={20}
            editable={!loading}
            placeholder="(00) 00000-0000"
          />
          <Text>Deixe o telefone em branco para manter o atual.</Text>
          <Button title={foto ? 'Trocar foto selecionada' : 'Selecionar foto'} variant="secondary" onPress={selectPhoto} loading={picking} disabled={loading} />
          <Text>{foto ? `Foto selecionada: ${foto.fileName || 'imagem'}` : 'JPEG, PNG ou WebP de até 5 MiB.'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} />
            <Button title="Salvar" onPress={handleSave} loading={loading} disabled={picking || (!phoneChanged && !foto)} />
          </View>
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
  },
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
});
