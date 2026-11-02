import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CatalogImage } from './catalog/CatalogImage';
import { validateProfilePhoto } from '../services/profileService';
import { theme } from '../styles/theme';
import { ProfilePhotoAsset } from '../types/profile';
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
  initialService?: {
    nome: string;
    preco: number;
    duracao_min: number;
    categoria_id?: number | null;
    foto_url?: string | null;
  } | null;
  onSave: (
    payload: { nome: string; preco: number; duracao_min: number; categoria_id?: number },
    photo?: ProfilePhotoAsset
  ) => Promise<void>;
};

export function ProviderServiceModal({
  visible,
  loading = false,
  onClose,
  categories,
  initialService,
  onSave,
}: ProviderServiceModalProps) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [photo, setPhoto] = useState<ProfilePhotoAsset>();
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [error, setError] = useState('');
  const shouldSelectCategory = Boolean(categories?.length);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setNome(initialService?.nome || '');
    setPreco(initialService ? String(initialService.preco) : '');
    setDuracao(initialService ? String(initialService.duracao_min) : '');
    setCategoriaId(initialService?.categoria_id || null);
    setPhoto(undefined);
    setError('');
  }, [initialService, visible]);

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

    try {
      await onSave({
        nome: nome.trim(),
        preco: precoNumber,
        duracao_min: duracaoNumber,
        categoria_id: categoriaId || undefined,
      }, photo);
      setNome('');
      setPreco('');
      setDuracao('');
      setCategoriaId(null);
      setPhoto(undefined);
      setError('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar o servico.');
    }
  }

  async function handlePickPhoto() {
    if (loading || pickingPhoto) {
      return;
    }

    setPickingPhoto(true);
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Permita o acesso a galeria para selecionar a foto do servico.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets.length) {
        return;
      }

      const image = result.assets[0];
      const selectedPhoto = {
        uri: image.uri,
        fileName: image.fileName,
        mimeType: image.mimeType,
        fileSize: image.fileSize,
        file: image.file,
      };
      validateProfilePhoto(selectedPhoto);
      setPhoto(selectedPhoto);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Nao foi possivel selecionar a foto.');
    } finally {
      setPickingPhoto(false);
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.title}>{initialService ? 'Editar servico' : 'Cadastro de servico'}</Text>

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

          <View style={styles.imageSection}>
            {photo ? (
              <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.imagePreview} />
            ) : initialService?.foto_url ? (
              <CatalogImage fotoUrl={initialService.foto_url} kind="service" style={styles.imagePreview} />
            ) : null}
            <View style={styles.imageContent}>
              <Text style={styles.imageLabel}>Foto do servico (opcional)</Text>
              <Text style={styles.imageText}>JPEG, PNG ou WebP de ate 5 MiB.</Text>
              <Button
                title={photo || initialService?.foto_url ? 'Alterar foto' : 'Selecionar foto'}
                size="sm"
                variant="outline"
                onPress={handlePickPhoto}
                loading={pickingPhoto}
                disabled={loading}
              />
              {photo ? (
                <Button title="Remover selecao" size="sm" variant="secondary" onPress={() => setPhoto(undefined)} disabled={loading} />
              ) : null}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={loading} />
            <Button title="Salvar" onPress={handleSave} loading={loading} />
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
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    maxHeight: '90%',
    maxWidth: 420,
    overflow: 'hidden',
    width: '100%',
  },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  imageSection: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  imagePreview: {
    borderRadius: theme.borderRadius.md,
    height: 96,
    width: 96,
  },
  imageContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  imageLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
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
