import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { theme } from '../styles/theme';
import { Button } from './Button';
import { Input } from './Input';

type ProviderServiceModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: { nome: string; preco: number; duracao_min: number }) => Promise<void>;
};

export function ProviderServiceModal({
  visible,
  loading = false,
  onClose,
  onSave,
}: ProviderServiceModalProps) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    const precoNumber = Number(preco.replace(',', '.'));
    const duracaoNumber = Number(duracao);

    if (!nome.trim() || Number.isNaN(precoNumber) || Number.isNaN(duracaoNumber)) {
      setError('Preencha nome, preco e duracao.');
      return;
    }

    await onSave({
      nome: nome.trim(),
      preco: precoNumber,
      duracao_min: duracaoNumber,
    });
    setNome('');
    setPreco('');
    setDuracao('');
    setError('');
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Cadastro de servico</Text>

          <Input label="Nome do servico" placeholder="Corte degradado" value={nome} onChangeText={setNome} />
          <Input
            label="Preco"
            keyboardType="decimal-pad"
            placeholder="45.00"
            value={preco}
            onChangeText={setPreco}
          />
          <Input
            label="Duracao em minutos"
            keyboardType="number-pad"
            placeholder="30"
            value={duracao}
            onChangeText={setDuracao}
          />

          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>Imagem opcional fora do escopo</Text>
          </View>

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
    textTransform: 'uppercase',
  },
  imagePlaceholder: {
    alignItems: 'center',
    borderColor: theme.colors.textMuted,
    borderRadius: theme.borderRadius.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
  },
  imageText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
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
