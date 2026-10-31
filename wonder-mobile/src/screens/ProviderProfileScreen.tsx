import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

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
  adicionarFotoEstabelecimento,
  atualizarPrestador,
  atualizarServico,
  criarHorario,
  criarPrestador,
  criarServico,
  listarFotosEstabelecimento,
  listarHorarios,
  listarServicos,
  obterPrestadorLogado,
  removerFotoEstabelecimento,
  removerHorario,
  removerServico,
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
import { FotoEstabelecimento, Horario, Prestador, PrestadorPayload, Servico } from '../types/provider';

const MAX_FOTOS_GALERIA = 8;

const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function normalizeOptionalText(value: string) {
  return value.trim();
}

export function ProviderProfileScreen() {
  const { usuario, signOut } = useAuth();
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasAtivas, setCategoriasAtivas] = useState<Categoria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [nomeEstab, setNomeEstab] = useState('');
  const [documento, setDocumento] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);
  const [uploadingProviderPhoto, setUploadingProviderPhoto] = useState(false);
  const [fotos, setFotos] = useState<FotoEstabelecimento[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [removingFotoId, setRemovingFotoId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [editingEstablishment, setEditingEstablishment] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Servico | null>(null);
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
      setEndereco(foundPrestador?.endereco || '');
      setNumero(foundPrestador?.numero || '');
      setBairro(foundPrestador?.bairro || '');
      setCidade(foundPrestador?.cidade || '');
      setEstado(foundPrestador?.estado || '');
      setComplemento(foundPrestador?.complemento || '');
      setCategoriasAtivas(await listarCategoriasAtivas());

      if (foundPrestador) {
        const [nextCategorias, nextServicos, nextHorarios, nextFotos] = await Promise.all([
          listarMinhasCategoriasPrestadorSeguro(),
          listarServicos(foundPrestador.id),
          listarHorarios(foundPrestador.id),
          listarFotosEstabelecimento(foundPrestador.id),
        ]);
        setCategorias(nextCategorias.map((item) => item.categoria));
        setServicos(nextServicos);
        setHorarios(nextHorarios);
        setFotos(nextFotos);
      } else {
        setCategorias([]);
        setServicos([]);
        setHorarios([]);
        setFotos([]);
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
      const payload: PrestadorPayload = {
        nome_estab: nomeEstab.trim(),
        documento: documento.trim(),
        endereco: normalizeOptionalText(endereco),
        numero: normalizeOptionalText(numero),
        bairro: normalizeOptionalText(bairro),
        cidade: normalizeOptionalText(cidade),
        estado: normalizeOptionalText(estado).toUpperCase(),
        complemento: normalizeOptionalText(complemento),
      };
      const created = await criarPrestador({
        ...payload,
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
      const payload: PrestadorPayload = {
        nome_estab: nomeEstab.trim(),
        documento: documento.trim(),
        endereco: normalizeOptionalText(endereco),
        numero: normalizeOptionalText(numero),
        bairro: normalizeOptionalText(bairro),
        cidade: normalizeOptionalText(cidade),
        estado: normalizeOptionalText(estado).toUpperCase(),
        complemento: normalizeOptionalText(complemento),
      };
      const updated = await atualizarPrestador(prestador.id, payload);
      setPrestador(updated);
      setNomeEstab(updated.nome_estab);
      setDocumento(updated.documento);
      setEndereco(updated.endereco || '');
      setNumero(updated.numero || '');
      setBairro(updated.bairro || '');
      setCidade(updated.cidade || '');
      setEstado(updated.estado || '');
      setComplemento(updated.complemento || '');
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

  async function handleAddGaleriaFoto() {
    if (!prestador) {
      return;
    }
    if (fotos.length >= MAX_FOTOS_GALERIA) {
      setError(`Limite de ${MAX_FOTOS_GALERIA} fotos na galeria atingido.`);
      return;
    }

    setUploadingFoto(true);
    setError('');

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError('Permita o acesso a galeria para adicionar fotos do estabelecimento.');
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
      const novaFoto = await adicionarFotoEstabelecimento(prestador.id, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });

      setFotos((atual) => [...atual, novaFoto]);
    } catch {
      setError('Nao foi possivel adicionar a foto a galeria.');
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleRemoveGaleriaFoto(fotoId: number) {
    if (!prestador) {
      return;
    }

    setRemovingFotoId(fotoId);
    setError('');

    try {
      await removerFotoEstabelecimento(prestador.id, fotoId);
      setFotos((atual) => atual.filter((foto) => foto.id !== fotoId));
    } catch {
      setError('Nao foi possivel remover a foto.');
    } finally {
      setRemovingFotoId(null);
    }
  }

  function handleCancelEditEstablishment() {
    setNomeEstab(prestador?.nome_estab || '');
    setDocumento(prestador?.documento || '');
    setEndereco(prestador?.endereco || '');
    setNumero(prestador?.numero || '');
    setBairro(prestador?.bairro || '');
    setCidade(prestador?.cidade || '');
    setEstado(prestador?.estado || '');
    setComplemento(prestador?.complemento || '');
    setEditingEstablishment(false);
    setError('');
  }

  async function handleSaveService(payload: { nome: string; preco: number; duracao_min: number; categoria_id?: number }) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingService) {
        await atualizarServico(prestador.id, editingService.id, payload);
      } else {
        await criarServico(prestador.id, payload);
      }
      setServiceModalVisible(false);
      setEditingService(null);
      setServicos(await listarServicos(prestador.id));
    } catch {
      setError(editingService ? 'Nao foi possivel atualizar o servico.' : 'Nao foi possivel cadastrar o servico.');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenCreateService() {
    setEditingService(null);
    setServiceModalVisible(true);
  }

  function handleOpenEditService(servico: Servico) {
    setEditingService(servico);
    setServiceModalVisible(true);
  }

  function handleCloseServiceModal() {
    setServiceModalVisible(false);
    setEditingService(null);
  }

  async function handleRemoveService(servicoId: number) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await removerServico(prestador.id, servicoId);
      setServicos(await listarServicos(prestador.id));
    } catch {
      setError('Nao foi possivel remover o servico.');
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
                <Text style={styles.cardSectionTitle}>Localizacao</Text>
                <Input label="Endereco" placeholder="Rua Principal" value={endereco} onChangeText={setEndereco} />
                <Input label="Numero" placeholder="123" value={numero} onChangeText={setNumero} />
                <Input label="Bairro" placeholder="Centro" value={bairro} onChangeText={setBairro} />
                <Input label="Cidade" placeholder="Pau dos Ferros" value={cidade} onChangeText={setCidade} />
                <Input
                  label="Estado"
                  placeholder="RN"
                  value={estado}
                  onChangeText={(value) => setEstado(value.toUpperCase())}
                />
                <Input
                  label="Complemento"
                  placeholder="Sala, bloco ou referencia"
                  value={complemento}
                  onChangeText={setComplemento}
                />
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
                <Text style={styles.cardSectionTitle}>Localizacao</Text>
                <InfoRow label="Endereco" value={formatAddress(prestador)} />
                <InfoRow label="Horario de funcionamento" value={horariosResumo} />
                <InfoRow label="Status do cadastro" value={prestador.status} />
              </>
            )}
          </Card>

          <View style={styles.galeriaHeader}>
            <Text style={styles.sectionTitle}>Galeria de fotos ({fotos.length}/{MAX_FOTOS_GALERIA})</Text>
            <Button
              title="Adicionar foto"
              size="sm"
              variant="secondary"
              onPress={handleAddGaleriaFoto}
              loading={uploadingFoto}
              disabled={fotos.length >= MAX_FOTOS_GALERIA || removingFotoId !== null}
            />
          </View>

          {fotos.length === 0 ? (
            <Card>
              <Text style={styles.cardText}>
                Nenhuma foto na galeria ainda. Adicione ate {MAX_FOTOS_GALERIA} fotos para os
                clientes verem ao abrir seu perfil.
              </Text>
            </Card>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={fotos}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.galeriaList}
              renderItem={({ item }) => (
                <View style={styles.galeriaItem}>
                  <CatalogImage fotoUrl={item.foto_url} kind="provider" style={styles.galeriaFoto} />
                  <Button
                    title="Remover"
                    size="sm"
                    variant="secondary"
                    onPress={() => handleRemoveGaleriaFoto(item.id)}
                    loading={removingFotoId === item.id}
                    disabled={removingFotoId !== null}
                  />
                </View>
              )}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>Gestao</Text>
          <Card style={styles.metricsCard}>
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
            <Button title="Cadastrar" size="sm" onPress={handleOpenCreateService} />
          </View>

          {servicos.map((servico) => (
            <Card key={servico.id} style={styles.listCard}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.cardTitle}>{servico.nome}</Text>
                  <Text style={styles.cardText}>
                    R$ {servico.preco.toFixed(2)} - {servico.duracao_min} min
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <Button title="Editar" size="sm" variant="secondary" onPress={() => handleOpenEditService(servico)} disabled={saving} />
                  <Button title="Remover" size="sm" variant="outline" onPress={() => handleRemoveService(servico.id)} disabled={saving} />
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      <ProviderServiceModal
        visible={serviceModalVisible}
        loading={saving}
        categories={categorias}
        initialService={editingService}
        onClose={handleCloseServiceModal}
        onSave={handleSaveService}
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

function formatAddress(prestador: Prestador) {
  const linhaEndereco = [prestador.endereco, prestador.numero].filter(Boolean).join(', ');
  const linhaCidade = [prestador.cidade, prestador.estado].filter(Boolean).join(' - ');
  const partes = [linhaEndereco, prestador.bairro, linhaCidade, prestador.complemento].filter(Boolean);
  return partes.length ? partes.join('\n') : 'Endereco nao informado.';
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
  serviceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
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
  galeriaHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  galeriaList: {
    gap: theme.spacing.sm,
  },
  galeriaItem: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  galeriaFoto: {
    borderRadius: theme.borderRadius.md,
    height: 110,
    width: 150,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.sm,
  },
});
