import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { Input } from '../../components/Input';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import {
  atualizarCategoriaAdmin,
  atualizarStatusCategoriaAdmin,
  criarCategoriaAdmin,
  listarCategoriasAdmin,
  uploadFotoCategoriaAdmin,
} from '../../services/admin';
import { theme } from '../../styles/theme';
import { AdminCategoria, AdminCategoriaStatus } from '../../types/admin';

function extractBackendMessage(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;

  function parseDetail(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(parseDetail).filter(Boolean).join('\n') || null;
    }

    if (typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      return (
        parseDetail(objectValue.detail) ||
        parseDetail(objectValue.message) ||
        parseDetail(objectValue.erros) ||
        null
      );
    }

    return null;
  }

  return parseDetail(responseData) || fallback;
}

export function AdminCategoriesScreen() {
  const [categorias, setCategorias] = useState<AdminCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<AdminCategoria | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const categoriasAtivas = useMemo(
    () => categorias.filter((categoria) => categoria.status === 'ativa'),
    [categorias]
  );
  const categoriasInativas = useMemo(
    () => categorias.filter((categoria) => categoria.status === 'inativa'),
    [categorias]
  );

  const load = useCallback(async () => {
    setError('');
    try {
      setCategorias(await listarCategoriasAdmin());
    } catch (loadError) {
      setError(extractBackendMessage(loadError, 'Nao foi possivel carregar as categorias.'));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openCreateModal() {
    setEditingCategoria(null);
    setNome('');
    setDescricao('');
    setError('');
    setSuccess('');
    setSelectedImage(null);
    setModalVisible(true);
  }

  function openEditModal(categoria: AdminCategoria) {
    setEditingCategoria(categoria);
    setNome(categoria.nome);
    setDescricao(categoria.descricao || '');
    setError('');
    setSuccess('');
    setSelectedImage(null);
    setModalVisible(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingCategoria(null);
    setNome('');
    setDescricao('');
    setSelectedImage(null);
  }

  async function handlePickImage() {
    setError('');
    setSuccess('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Permita o acesso a galeria para selecionar a imagem da categoria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      setSelectedImage(result.assets[0]);
    } catch (pickError) {
      setError(extractBackendMessage(pickError, 'Nao foi possivel selecionar a imagem.'));
    }
  }

  async function handleSave() {
    if (!nome.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
      };

      const savedCategoria = editingCategoria
        ? await atualizarCategoriaAdmin(editingCategoria.id, payload)
        : await criarCategoriaAdmin(payload);

      if (selectedImage) {
        await uploadFotoCategoriaAdmin(savedCategoria.id, {
          uri: selectedImage.uri,
          fileName: selectedImage.fileName,
          mimeType: selectedImage.mimeType,
        });
      }

      setModalVisible(false);
      setEditingCategoria(null);
      setNome('');
      setDescricao('');
      setSelectedImage(null);
      setSuccess(selectedImage ? 'Categoria e imagem salvas com sucesso.' : 'Categoria salva com sucesso.');
      await load();
    } catch (saveError) {
      setError(extractBackendMessage(saveError, 'Nao foi possivel salvar a categoria.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(categoria: AdminCategoria, status: AdminCategoriaStatus) {
    setSavingStatusId(categoria.id);
    setError('');
    setSuccess('');

    try {
      await atualizarStatusCategoriaAdmin(categoria.id, { status });
      setSuccess(status === 'ativa' ? 'Categoria ativada com sucesso.' : 'Categoria inativada com sucesso.');
      await load();
    } catch (statusError) {
      setError(extractBackendMessage(statusError, 'Nao foi possivel alterar o status da categoria.'));
    } finally {
      setSavingStatusId(null);
    }
  }

  if (loading) {
    return <LoadingIndicator text="Carregando categorias..." />;
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Categorias</Text>
            <Text style={styles.subtitle}>Gerencie categorias ativas e inativas.</Text>
          </View>
          <Button title="Nova +" size="sm" onPress={openCreateModal} />
        </View>

        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        {success ? (
          <Card>
            <Text style={styles.success}>{success}</Text>
          </Card>
        ) : null}

        <CategorySection
          title="Ativas"
          emptyText="Nenhuma categoria ativa."
          categorias={categoriasAtivas}
          savingStatusId={savingStatusId}
          onEdit={openEditModal}
          onStatus={(categoria) => handleStatus(categoria, 'inativa')}
        />

        <CategorySection
          title="Inativas"
          emptyText="Nenhuma categoria inativa."
          categorias={categoriasInativas}
          savingStatusId={savingStatusId}
          onEdit={openEditModal}
          onStatus={(categoria) => handleStatus(categoria, 'ativa')}
        />
      </ScrollView>

      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategoria ? 'Editar categoria' : 'Cadastrar categorias'}
            </Text>

            <Input
              label="Nome da categoria"
              placeholder="Ex.: Cabelo masculino"
              value={nome}
              onChangeText={setNome}
            />

            <Input
              label="Descricao"
              placeholder="Descricao da categoria"
              value={descricao}
              onChangeText={setDescricao}
              multiline
            />

            <View style={styles.imagePreviewRow}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              ) : (
                <CatalogImage fotoUrl={editingCategoria?.foto_url} kind="category" style={styles.imagePreview} />
              )}
              <View style={styles.imagePreviewContent}>
                <Text style={styles.imagePreviewTitle}>Imagem da categoria</Text>
                <Button
                  title={selectedImage || editingCategoria?.foto_url ? 'Trocar imagem' : 'Selecionar imagem'}
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onPress={handlePickImage}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="secondary" disabled={saving} onPress={closeModal} />
              <Button title="Salvar" loading={saving} onPress={handleSave} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CategorySection({
  title,
  emptyText,
  categorias,
  savingStatusId,
  onEdit,
  onStatus,
}: {
  title: string;
  emptyText: string;
  categorias: AdminCategoria[];
  savingStatusId: number | null;
  onEdit: (categoria: AdminCategoria) => void;
  onStatus: (categoria: AdminCategoria) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {categorias.length ? (
        categorias.map((categoria) => (
          <CategoryCard
            key={categoria.id}
            categoria={categoria}
            savingStatus={savingStatusId === categoria.id}
            onEdit={() => onEdit(categoria)}
            onStatus={() => onStatus(categoria)}
          />
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>{emptyText}</Text>
        </Card>
      )}
    </View>
  );
}

function CategoryCard({
  categoria,
  savingStatus,
  onEdit,
  onStatus,
}: {
  categoria: AdminCategoria;
  savingStatus: boolean;
  onEdit: () => void;
  onStatus: () => void;
}) {
  const ativa = categoria.status === 'ativa';

  return (
    <Card style={styles.categoryCard}>
      <CatalogImage fotoUrl={categoria.foto_url} kind="category" style={styles.categoryImage} />

      <View style={styles.categoryInfo}>
        <Text style={styles.cardTitle}>{categoria.nome}</Text>
        {categoria.descricao ? <Text style={styles.cardText}>{categoria.descricao}</Text> : null}
        <Text style={[styles.statusText, ativa ? styles.statusActive : styles.statusInactive]}>
          {ativa ? 'Ativa' : 'Inativa'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Editar" size="sm" variant="outline" onPress={onEdit} />
        <Button
          title={ativa ? 'Inativar' : 'Ativar'}
          size="sm"
          variant={ativa ? 'danger' : 'secondary'}
          loading={savingStatus}
          disabled={savingStatus}
          onPress={onStatus}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  categoryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  categoryImage: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    height: 56,
    width: 56,
  },
  categoryInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  statusActive: {
    color: theme.colors.success,
  },
  statusInactive: {
    color: theme.colors.textMuted,
  },
  actions: {
    gap: theme.spacing.xs,
    width: 96,
  },
  empty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
  success: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textTransform: 'uppercase',
  },
  imagePreviewRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  imagePreview: {
    borderRadius: theme.borderRadius.md,
    height: 76,
    width: 76,
  },
  imagePreviewContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  imagePreviewTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
});
