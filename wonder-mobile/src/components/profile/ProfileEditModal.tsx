import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../styles/theme';
import { UserProfile, UserProfileUpdate } from '../../types/profile';
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
  const [nome, setNome] = useState(profile.nome);
  const [telefone, setTelefone] = useState(profile.telefone || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNome(profile.nome);
      setTelefone(profile.telefone || '');
      setError('');
    }
  }, [profile.nome, profile.telefone, visible]);

  async function handleSave() {
    if (!nome.trim()) {
      setError('Informe seu nome.');
      return;
    }

    await onSave({
      nome: nome.trim(),
      telefone: telefone.trim() || null,
    });
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Editar perfil</Text>
          <Input label="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" />
          <Input
            label="Telefone"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            placeholder="(00) 00000-0000"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} />
            <Button title="Salvar" onPress={handleSave} loading={loading} />
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
