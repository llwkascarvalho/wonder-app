import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { A, AdminAction, AdminMessage, AdminPage, adminV4 } from '../../components/admin/AdminV4';
import { Card } from '../../components/Card';
import { CatalogImage } from '../../components/catalog/CatalogImage';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import {
  atualizarCategoriaAdmin,
  atualizarStatusCategoriaAdmin,
  criarCategoriaAdmin,
  listarCategoriasAdmin,
  uploadFotoCategoriaAdmin,
} from '../../services/admin';
import { validateProfilePhoto } from '../../services/profileService';
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

  return parseDetail(responseData) || (error instanceof Error ? error.message : fallback);
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
  const [imageRevisions, setImageRevisions] = useState<Record<number, number>>({});

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
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Permita o acesso a galeria para selecionar a imagem da categoria.');
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

      const asset = result.assets[0];
      validateProfilePhoto({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        file: asset.file,
      });
      setSelectedImage(asset);
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

      setModalVisible(false);
      setEditingCategoria(null);
      setNome('');
      setDescricao('');
      const imageToUpload = selectedImage;
      setSelectedImage(null);
      let imageUploadError = '';

      if (imageToUpload) {
        try {
          await uploadFotoCategoriaAdmin(savedCategoria.id, {
            uri: imageToUpload.uri,
            fileName: imageToUpload.fileName,
            mimeType: imageToUpload.mimeType,
            fileSize: imageToUpload.fileSize,
            file: imageToUpload.file,
          });
          setImageRevisions(previous => ({ ...previous, [savedCategoria.id]: Date.now() }));
          setSuccess('Categoria e imagem salvas com sucesso.');
        } catch (imageError) {
          const detail = extractBackendMessage(
            imageError,
            'Nao foi possivel enviar a imagem.'
          );
          imageUploadError = `A categoria foi salva, mas a imagem nao foi enviada. ${detail}`;
        }
      } else {
        setSuccess('Categoria salva com sucesso.');
      }
      await load();
      if (imageUploadError) {
        setError(imageUploadError);
      }
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
      <AdminPage title="Categorias" subtitle={`${categorias.length} categorias cadastradas.`}
        refreshing={refreshing} onRefresh={handleRefresh} wide>
        <AdminAction label="Nova categoria" onPress={openCreateModal} />

        {error ? (
          <AdminMessage danger>{error}</AdminMessage>
        ) : null}

        {success ? (
          <AdminMessage>{success}</AdminMessage>
        ) : null}

        <CategorySection
          title="Ativas"
          emptyText="Nenhuma categoria ativa."
          categorias={categoriasAtivas}
          imageRevisions={imageRevisions}
          savingStatusId={savingStatusId}
          onEdit={openEditModal}
          onStatus={(categoria) => handleStatus(categoria, 'inativa')}
        />

        <CategorySection
          title="Inativas"
          emptyText="Nenhuma categoria inativa."
          categorias={categoriasInativas}
          imageRevisions={imageRevisions}
          savingStatusId={savingStatusId}
          onEdit={openEditModal}
          onStatus={(categoria) => handleStatus(categoria, 'ativa')}
        />
      </AdminPage>

      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategoria ? 'Editar categoria' : 'Nova categoria'}
            </Text>

            <Text style={adminV4.body}>Cadastre uma categoria para organizar os serviços.</Text>

            <View style={styles.field}><Text style={styles.fieldLabel}>Nome da categoria *</Text>
              <TextInput accessibilityLabel="Nome da categoria" placeholder="Ex.: Cabelo masculino" placeholderTextColor={A.textMuted}
                value={nome} onChangeText={setNome} style={styles.fieldInput} /></View>
            <View style={styles.field}><Text style={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput accessibilityLabel="Descrição" placeholder="Descreva quando esta categoria deve ser utilizada."
                placeholderTextColor={A.textMuted} value={descricao} onChangeText={setDescricao} multiline style={[styles.fieldInput, styles.textarea]} /></View>

            <View style={styles.imagePreviewRow}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              ) : (
                <CatalogImage fotoUrl={editingCategoria?.foto_url} kind="category" style={styles.imagePreview}
                  revision={editingCategoria ? imageRevisions[editingCategoria.id] : undefined} />
              )}
              <View style={styles.imagePreviewContent}>
                <Text style={styles.imagePreviewTitle}>Imagem da categoria (opcional)</Text>
                <AdminAction label={selectedImage || editingCategoria?.foto_url ? 'Trocar imagem' : 'Selecionar imagem'}
                  compact kind="secondary" disabled={saving} onPress={handlePickImage} />
              </View>
            </View>

            <Text style={adminV4.muted}>JPEG, PNG ou WebP com até 5 MB.</Text>
            {error ? <AdminMessage danger>{error}</AdminMessage> : null}
            <View style={styles.modalActions}>
              <View style={styles.action}><AdminAction label="Cancelar" kind="secondary" disabled={saving} onPress={closeModal} /></View>
              <View style={styles.action}><AdminAction label={saving ? 'Salvando…' : 'Salvar categoria'} disabled={saving} onPress={() => { void handleSave(); }} /></View>
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
  imageRevisions,
  savingStatusId,
  onEdit,
  onStatus,
}: {
  title: string;
  emptyText: string;
  categorias: AdminCategoria[];
  imageRevisions: Record<number, number>;
  savingStatusId: number | null;
  onEdit: (categoria: AdminCategoria) => void;
  onStatus: (categoria: AdminCategoria) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width >= 900 ? (Math.min(width - (width >= 1280 ? 272 : 248) - 40, 1040) - 12) / 2 : undefined;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {categorias.length ? (
        <View style={styles.categoryGrid}>{categorias.map((categoria) => (
          <CategoryCard
            key={categoria.id}
            categoria={categoria}
            imageRevision={imageRevisions[categoria.id]}
            width={cardWidth}
            savingStatus={savingStatusId === categoria.id}
            onEdit={() => onEdit(categoria)}
            onStatus={() => onStatus(categoria)}
          />
        ))}</View>
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
  imageRevision,
  width,
  savingStatus,
  onEdit,
  onStatus,
}: {
  categoria: AdminCategoria;
  imageRevision?: number;
  width?: number;
  savingStatus: boolean;
  onEdit: () => void;
  onStatus: () => void;
}) {
  const ativa = categoria.status === 'ativa';

  return (
    <View style={[adminV4.card, styles.categoryCard, { width: width ?? '100%' }]}>
      <View style={styles.categoryTop}>
        <CatalogImage fotoUrl={categoria.foto_url} kind="category" style={styles.categoryImage} revision={imageRevision} />
        <View style={styles.categoryInfo}>
          <Text style={styles.cardTitle}>{categoria.nome}</Text>
          {categoria.descricao ? <Text style={styles.cardText} numberOfLines={2}>{categoria.descricao}</Text> : null}
          <Text style={[styles.statusText, ativa ? styles.statusActive : styles.statusInactive]}>{ativa ? 'Ativa' : 'Inativa'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.action}><AdminAction label="Editar" compact kind="secondary" onPress={onEdit} /></View>
        <View style={styles.action}><AdminAction label={ativa ? 'Inativar' : 'Ativar'} compact kind={ativa ? 'danger' : 'secondary'} disabled={savingStatus} onPress={onStatus} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionTitle: {
    color: A.text,
    fontFamily: A.fontDisplay,
    fontSize: 22,
  },
  categoryCard: { gap: 14, padding: 14 },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryImage: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 16,
    height: 56,
    width: 56,
  },
  categoryInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: A.text,
    fontFamily: A.fontDisplay,
    fontSize: 19,
  },
  cardText: {
    color: A.textMuted,
    fontFamily: A.fontBody,
    fontSize: 14,
  },
  statusText: {
    fontFamily: A.fontBodySemi,
    fontSize: 13,
  },
  statusActive: {
    color: theme.colors.success,
  },
  statusInactive: {
    color: theme.colors.textMuted,
  },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  empty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(46,10,87,0.62)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: A.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
    padding: 20,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 520,
  },
  modalTitle: {
    color: A.text,
    fontFamily: A.fontDisplay,
    fontSize: 24,
  },
  imagePreviewRow: {
    alignItems: 'center',
    backgroundColor: A.field,
    borderRadius: 16,
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
    color: A.text,
    fontFamily: A.fontBodySemi,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  field: { gap: 8 },
  fieldLabel: { color: A.text, fontFamily: A.fontBodySemi, fontSize: 15 },
  fieldInput: { height: 56, borderRadius: 16, backgroundColor: A.field, paddingHorizontal: 16,
    color: A.text, fontFamily: A.fontBody, fontSize: 16 },
  textarea: { height: 92, paddingVertical: 14, textAlignVertical: 'top' },
});
