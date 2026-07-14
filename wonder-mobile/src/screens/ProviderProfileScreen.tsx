import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { Input } from '../components/Input';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ProfileScreenContent } from '../components/profile/ProfileScreenContent';
import { ProviderIcon, ProviderIconName } from '../components/provider/ProviderIcon';
import { ProviderScheduleModal } from '../components/ProviderScheduleModal';
import { ProviderServiceModal } from '../components/ProviderServiceModal';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarPrestador,
  criarHorario,
  criarPrestador,
  criarServico,
  listarHorarios,
  listarServicos,
  obterPrestadorLogado,
  removerHorario,
  uploadFotoPrestador,
} from '../services/provider';
import {
  associarMinhasCategoriasPrestador,
  listarCategoriasAtivas,
  listarMinhasCategoriasPrestadorSeguro,
  removerMinhaCategoriaPrestador,
} from '../services/providerOnboarding';
import { theme } from '../styles/theme';
import { Categoria } from '../types/catalogo';
import { Horario, Prestador, Servico } from '../types/provider';

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export function ProviderProfileScreen() {
  const { usuario, signOut } = useAuth();
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasAtivas, setCategoriasAtivas] = useState<Categoria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [nomeEstab, setNomeEstab] = useState('');
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [uploadingProviderPhoto, setUploadingProviderPhoto] = useState(false);
  const [error, setError] = useState('');
  const [editingEstablishment, setEditingEstablishment] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const horariosResumo = useMemo(() => {
    if (!horarios.length) {
      return 'Nenhum horario cadastrado';
    }

    return horarios
      .map((horario) => `${dayLabels[horario.dia_semana] || 'Dia'} ${horario.hora_inicio} - ${horario.hora_fim}`)
      .join(', ');
  }, [horarios]);

  const loadProviderProfile = useCallback(async () => {
    if (!usuario?.id) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      const foundPrestador = await obterPrestadorLogado(usuario.id);
      setPrestador(foundPrestador);
      setNomeEstab(foundPrestador?.nome_estab || '');
      setDocumento(foundPrestador?.documento || '');
      setCategoriasAtivas(await listarCategoriasAtivas());

      if (foundPrestador) {
        const [nextCategorias, nextServicos, nextHorarios] = await Promise.all([
          listarMinhasCategoriasPrestadorSeguro(),
          listarServicos(foundPrestador.id),
          listarHorarios(foundPrestador.id),
        ]);
        setCategorias(nextCategorias.map((item) => item.categoria));
        setServicos(nextServicos);
        setHorarios(nextHorarios);
      } else {
        setCategorias([]);
        setServicos([]);
        setHorarios([]);
      }
    } catch {
      setError('Nao foi possivel carregar o perfil do prestador.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    loadProviderProfile();
  }, [loadProviderProfile]);

  async function handleCreatePrestador() {
    if (!nomeEstab.trim() || !documento.trim()) {
      setError('Informe nome do estabelecimento e documento.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await criarPrestador({
        nome_estab: nomeEstab.trim(),
        documento: documento.trim(),
      });
      setPrestador(created);
      await loadProviderProfile();
    } catch {
      setError('Nao foi possivel criar o perfil do prestador.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePrestador() {
    if (!prestador) {
      return;
    }

    if (!nomeEstab.trim() || !documento.trim()) {
      setError('Informe nome do estabelecimento e documento.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await atualizarPrestador(prestador.id, {
        nome_estab: nomeEstab.trim(),
        documento: documento.trim(),
      });
      setPrestador(updated);
      setNomeEstab(updated.nome_estab);
      setDocumento(updated.documento);
      setEditingEstablishment(false);
    } catch {
      setError('Nao foi possivel atualizar o estabelecimento.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeProviderPhoto() {
    if (!prestador) {
      return;
    }

    setUploadingProviderPhoto(true);
    setError('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Permita o acesso a galeria para alterar a foto do estabelecimento.');
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

      const asset = result.assets[0];
      const updated = await uploadFotoPrestador(prestador.id, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });

      setPrestador(updated);
    } catch {
      setError('Nao foi possivel enviar a foto do estabelecimento.');
    } finally {
      setUploadingProviderPhoto(false);
    }
  }

  function handleCancelEditEstablishment() {
    setNomeEstab(prestador?.nome_estab || '');
    setDocumento(prestador?.documento || '');
    setEditingEstablishment(false);
    setError('');
  }

  async function handleCreateService(payload: { nome: string; preco: number; duracao_min: number; categoria_id?: number }) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await criarServico(prestador.id, payload);
      setServiceModalVisible(false);
      setServicos(await listarServicos(prestador.id));
    } catch {
      setError('Nao foi possivel cadastrar o servico.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSchedule(payload: { dia_semana: number; hora_inicio: string; hora_fim: string }) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await criarHorario(prestador.id, payload);
      setScheduleModalVisible(false);
      setHorarios(await listarHorarios(prestador.id));
    } catch {
      setError('Nao foi possivel cadastrar o horario.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSchedule(horarioId: number) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await removerHorario(prestador.id, horarioId);
      setHorarios(await listarHorarios(prestador.id));
    } catch {
      setError('Nao foi possivel remover o horario.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory(categoriaId: number) {
    setSavingCategoryId(categoriaId);
    setError('');
    try {
      const updated = await associarMinhasCategoriasPrestador([categoriaId]);
      setCategorias(updated.map((item) => item.categoria));
    } catch {
      setError('Nao foi possivel associar a categoria.');
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function handleRemoveCategory(categoriaId: number) {
    setSavingCategoryId(categoriaId);
    setError('');
    try {
      await removerMinhaCategoriaPrestador(categoriaId);
      const updated = await listarMinhasCategoriasPrestadorSeguro();
      setCategorias(updated.map((item) => item.categoria));
    } catch {
      setError('Nao foi possivel remover a categoria.');
    } finally {
      setSavingCategoryId(null);
    }
  }

  return (
    <ProfileScreenContent
      title="Perfil pessoal"
      subtitle="Gerencie seus dados pessoais e profissionais."
      onSignOut={signOut}
    >
      {loading ? (
      <LoadingIndicator text="Carregando dados do estabelecimento..." />
      ) : !prestador ? (
        <Card style={styles.formCard}>
          <Text style={styles.title}>Criar perfil de prestador</Text>
          <Input
            label="Nome do estabelecimento"
            placeholder="Diego BarberShop"
            value={nomeEstab}
            onChangeText={setNomeEstab}
          />
          <Input label="CPF/CNPJ" placeholder="00.000.000/0000-00" value={documento} onChangeText={setDocumento} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Salvar perfil" onPress={handleCreatePrestador} loading={saving} />
        </Card>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Estabelecimento</Text>
          <Card style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSectionTitle}>Dados do estabelecimento</Text>
              {!editingEstablishment ? (
                <Button title="Editar" size="sm" variant="secondary" onPress={() => setEditingEstablishment(true)} />
              ) : null}
            </View>

            {editingEstablishment ? (
              <>
                <Input
                  label="Nome do estabelecimento"
                  placeholder="Diego BarberShop"
                  value={nomeEstab}
                  onChangeText={setNomeEstab}
                />
                <Input label="CPF/CNPJ" placeholder="00.000.000/0000-00" value={documento} onChangeText={setDocumento} />
                <View style={styles.editActions}>
                  <Button title="Cancelar" size="sm" variant="secondary" onPress={handleCancelEditEstablishment} disabled={saving} />
                  <Button title="Salvar" size="sm" onPress={handleUpdatePrestador} loading={saving} />
                </View>
              </>
            ) : (
              <>
                <View style={styles.providerPhotoRow}>
                  <CatalogImage fotoUrl={prestador.foto_url} kind="provider" style={styles.providerPhoto} />
                  <View style={styles.providerPhotoContent}>
                    <Text style={styles.providerPhotoTitle}>Foto do estabelecimento</Text>
                    <Button
                      title="Alterar foto"
                      size="sm"
                      variant="secondary"
                      onPress={handleChangeProviderPhoto}
                      loading={uploadingProviderPhoto}
                      disabled={saving}
                    />
                  </View>
                </View>
                <InfoRow label="Nome do estabelecimento" value={prestador.nome_estab} />
                <InfoRow label="CPF/CNPJ" value={prestador.documento} />
                <InfoRow label="Horario de funcionamento" value={horariosResumo} />
                <InfoRow label="Status do cadastro" value={prestador.status} />
              </>
            )}
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>Gestao</Text>
          <Card style={styles.metricsCard}>
            <MetricItem icon="star" label="Avaliacao" value="-" />
            <MetricItem icon="category" label="Categorias" value={String(categorias.length)} />
            <MetricItem icon="content-cut" label="Servicos" value={String(servicos.length)} />
            <MetricItem icon="schedule" label="Horarios" value={String(horarios.length)} />
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorias</Text>
          </View>

          {categorias.length ? (
            <View style={styles.chips}>
              {categorias.map((categoria) => (
                <View key={categoria.id} style={styles.chip}>
                  <Text style={styles.chipText}>{categoria.nome}</Text>
                  <Button
                    title="Remover"
                    size="sm"
                    variant="outline"
                    loading={savingCategoryId === categoria.id}
                    disabled={savingCategoryId !== null}
                    onPress={() => handleRemoveCategory(categoria.id)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Card>
              <Text style={styles.cardText}>Nenhuma categoria associada.</Text>
            </Card>
          )}

          <Card style={styles.detailsCard}>
            <Text style={styles.cardSectionTitle}>Associar categoria ativa</Text>
            <View style={styles.chips}>
              {categoriasAtivas
                .filter((categoria) => !categorias.some((item) => item.id === categoria.id))
                .map((categoria) => (
                  <Button
                    key={categoria.id}
                    title={categoria.nome}
                    size="sm"
                    variant="secondary"
                    loading={savingCategoryId === categoria.id}
                    disabled={savingCategoryId !== null}
                    onPress={() => handleAddCategory(categoria.id)}
                  />
                ))}
              {categoriasAtivas.every((categoria) => categorias.some((item) => item.id === categoria.id)) ? (
                <Text style={styles.cardText}>Todas as categorias ativas ja estao associadas.</Text>
              ) : null}
            </View>
          </Card>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Horarios cadastrados</Text>
            <Button title="Adicionar" size="sm" onPress={() => setScheduleModalVisible(true)} />
          </View>

          {horarios.map((horario) => (
            <Card key={horario.id} style={styles.listCard}>
              <View style={styles.listRow}>
                <Text style={styles.cardTitle}>{dayLabels[horario.dia_semana] || 'Dia'}</Text>
                <Text style={styles.cardText}>
                  {horario.hora_inicio} - {horario.hora_fim}
                </Text>
                <Button
                  title="Remover"
                  size="sm"
                  variant="outline"
                  onPress={() => handleRemoveSchedule(horario.id)}
                  disabled={saving}
                />
              </View>
            </Card>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Servicos cadastrados</Text>
            <Button title="Cadastrar" size="sm" onPress={() => setServiceModalVisible(true)} />
          </View>

          {servicos.map((servico) => (
            <Card key={servico.id} style={styles.listCard}>
              <Text style={styles.cardTitle}>{servico.nome}</Text>
              <Text style={styles.cardText}>
                R$ {servico.preco.toFixed(2)} - {servico.duracao_min} min
              </Text>
            </Card>
          ))}
        </>
      )}

      <ProviderServiceModal
        visible={serviceModalVisible}
        loading={saving}
        categories={categorias}
        onClose={() => setServiceModalVisible(false)}
        onSave={handleCreateService}
      />
      <ProviderScheduleModal
        visible={scheduleModalVisible}
        loading={saving}
        onClose={() => setScheduleModalVisible(false)}
        onSave={handleCreateSchedule}
      />
    </ProfileScreenContent>
  );
}

function MetricItem({ icon, label, value }: { icon: ProviderIconName; label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <ProviderIcon name={icon} size={24} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  metricsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xs,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  detailsCard: {
    gap: theme.spacing.sm,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  cardSectionTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  editActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  providerPhotoRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
  },
  providerPhoto: {
    borderRadius: theme.borderRadius.md,
    height: 88,
    width: 88,
  },
  providerPhotoContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  providerPhotoTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  infoRow: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  infoLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  infoValue: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: theme.borderRadius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  listCard: {
    gap: theme.spacing.xs,
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  cardText: {
    color: theme.colors.textSecondary,
    flex: 1,
    fontSize: theme.fontSize.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
