import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../styles/theme';
import { Button } from './Button';
import { Input } from './Input';

type ServiceCategoryOption = {
  id: number;
  nome: string;
};

type ProviderServiceModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  categories?: ServiceCategoryOption[];
  onSave: (payload: { nome: string; preco: number; duracao_min: number; categoria_id?: number }) => Promise<void>;
};

export function ProviderServiceModal({
  visible,
  loading = false,
  onClose,
  categories,
  onSave,
}: ProviderServiceModalProps) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const shouldSelectCategory = Boolean(categories?.length);

  async function handleSave() {
    const precoNumber = Number(preco.replace(',', '.'));
    const duracaoNumber = Number(duracao);

    if (!nome.trim() || Number.isNaN(precoNumber) || Number.isNaN(duracaoNumber)) {
      setError('Preencha nome, preco e duracao.');
      return;
    }

    if (shouldSelectCategory && !categoriaId) {
      setError('Selecione a categoria do servico.');
      return;
    }

    await onSave({
      nome: nome.trim(),
      preco: precoNumber,
      duracao_min: duracaoNumber,
      categoria_id: categoriaId || undefined,
    });
    setNome('');
    setPreco('');
    setDuracao('');
    setCategoriaId(null);
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

          {categories?.length ? (
            <View style={styles.categorySection}>
              <Text style={styles.categoryLabel}>Categoria do servico</Text>
              <View style={styles.categoryList}>
                {categories.map((categoria) => {
                  const selected = categoriaId === categoria.id;
                  return (
                    <Pressable
                      key={categoria.id}
                      accessibilityRole="button"
                      onPress={() => setCategoriaId(categoria.id)}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    >
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                        {categoria.nome}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

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
  categorySection: {
    gap: theme.spacing.sm,
  },
  categoryLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryChip: {
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  categoryChipText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  categoryChipTextSelected: {
    color: theme.colors.white,
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
