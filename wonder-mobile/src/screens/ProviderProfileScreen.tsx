import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
import { listarFotosEstabelecimento } from '../services/catalogo';
import {
  adicionarFotoEstabelecimento,
  atualizarPrestador,
  atualizarServico,
  criarHorariosLote,
  criarServico,
  listarHorarios,
  listarServicos,
  obterPrestadorLogado,
  removerFotoEstabelecimento,
  removerHorario,
  removerServico,
  uploadFotoPrestador,
  uploadFotoServico,
} from '../services/provider';
import {
  listarCategoriasAtivas,
  listarMinhasCategoriasPrestadorSeguro,
} from '../services/providerOnboarding';
import { customerTheme } from '../styles/customerTheme';
import { theme } from '../styles/theme';
import { Categoria, FotoEstabelecimento } from '../types/catalogo';
import { Horario, Prestador, PrestadorPayload, Servico } from '../types/provider';
import { ProfilePhotoAsset } from '../types/profile';
import { getProfileErrorMessage } from '../services/profileService';

const C = customerTheme.v4;
const MAX_FOTOS_GALERIA = 8;

const dayLabels = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function horaCurta(value: string) {
  return value.slice(0, 5);
}

function normalizeOptionalText(value: string) {
  return value.trim();
}

function withImageVersion(url: string | null | undefined, version: number | undefined) {
  if (!url || !version) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

function scheduleErrorMessage(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 409) return 'Este horário se sobrepõe a outro já cadastrado.';
  if (status === 400) return 'Confira o dia e o intervalo informado.';
  return getProfileErrorMessage(error, 'Não foi possível cadastrar o horário.');
}

export function ProviderProfileScreen() {
  const { usuario, signOut } = useAuth();
  const { width } = useWindowDimensions();
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
  const [uploadingProviderPhoto, setUploadingProviderPhoto] = useState(false);
  const [providerPhotoVersion, setProviderPhotoVersion] = useState(0);
  const [fotos, setFotos] = useState<FotoEstabelecimento[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [removingFotoId, setRemovingFotoId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [editingEstablishment, setEditingEstablishment] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Servico | null>(null);
  const [servicePhotoVersions, setServicePhotoVersions] = useState<Record<number, number>>({});
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const horariosPorDia = useMemo(() => dayLabels.slice(1).map((nome, index) => ({
    nome,
    dia: index + 1,
    intervalos: horarios.filter((horario) => horario.dia_semana === index + 1)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  })).filter((grupo) => grupo.intervalos.length > 0), [horarios]);

  const horariosResumo = useMemo(() => horariosPorDia.length
    ? horariosPorDia.map((grupo) => `${grupo.nome} ${grupo.intervalos
      .map((horario) => `${horaCurta(horario.hora_inicio)}–${horaCurta(horario.hora_fim)}`).join(', ')}`).join(' · ')
    : 'Nenhum horário cadastrado', [horariosPorDia]);

  const loadProviderProfile = useCallback(async () => {
    if (!usuario?.id) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      const foundPrestador = await obterPrestadorLogado();
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
        setCategorias(nextCategorias);
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

  async function handleUpdatePrestador() {
    if (!prestador) {
      return;
    }

    if (!nomeEstab.trim()) {
      setError('Informe o nome do estabelecimento.');
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
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Permita o acesso à galeria para alterar a foto do estabelecimento.');
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
      const updated = await uploadFotoPrestador(prestador.id, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        file: asset.file,
      });

      setPrestador(updated);
      setProviderPhotoVersion((current) => current + 1);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      setError(status === 409
        ? 'A foto não pode ser alterada enquanto o cadastro está em análise.'
        : getProfileErrorMessage(error, 'Não foi possível enviar a foto do estabelecimento.'));
    } finally {
      setUploadingProviderPhoto(false);
    }
  }

  async function handleAddGaleriaFoto() {
    if (!prestador || fotos.length >= MAX_FOTOS_GALERIA) return;
    setUploadingFoto(true);
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Permita o acesso à galeria para adicionar uma foto.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      await adicionarFotoEstabelecimento(prestador.id, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        file: asset.file,
      });
      setFotos(await listarFotosEstabelecimento(prestador.id));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? 'A galeria está cheia ou o cadastro está em análise.'
        : getProfileErrorMessage(error, 'Não foi possível adicionar a foto à galeria.'));
    } finally {
      setUploadingFoto(false);
    }
  }

  async function handleRemoveGaleriaFoto(fotoId: number) {
    if (!prestador) return;
    setRemovingFotoId(fotoId);
    setError('');
    try {
      await removerFotoEstabelecimento(prestador.id, fotoId);
      setFotos((current) => current.filter((foto) => foto.id !== fotoId));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      setError(status === 409 ? 'A galeria não pode ser alterada enquanto o cadastro está em análise.'
        : getProfileErrorMessage(error, 'Não foi possível remover a foto da galeria.'));
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

  async function handleSaveService(
    payload: { nome: string; preco: number; duracao_min: number; categoria_id?: number },
    photo?: ProfilePhotoAsset
  ) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const savedService = editingService
        ? await atualizarServico(prestador.id, editingService.id, payload)
        : await criarServico(prestador.id, payload);
      let finalService = savedService;
      let photoError = '';

      if (photo) {
        try {
          finalService = await uploadFotoServico(prestador.id, savedService.id, photo);
          setServicePhotoVersions((current) => ({
            ...current,
            [savedService.id]: (current[savedService.id] || 0) + 1,
          }));
        } catch (uploadError) {
          photoError = uploadError instanceof Error ? uploadError.message : 'Nao foi possivel enviar a foto.';
        }
      }

      setServiceModalVisible(false);
      setEditingService(null);
      setServicos((current) => editingService
        ? current.map((item) => item.id === finalService.id ? finalService : item)
        : [...current, finalService].sort((left, right) => left.nome.localeCompare(right.nome)));

      try {
        const nextCategories = await listarMinhasCategoriasPrestadorSeguro();
        setCategorias(nextCategories);
      } catch {
        setError('O servico foi salvo, mas nao foi possivel atualizar as categorias na tela. Recarregue o perfil.');
      }
      if (photoError) {
        setError(`O servico foi salvo, mas a foto nao foi enviada. ${photoError}`);
      }
    } catch {
      const message = editingService ? 'Nao foi possivel atualizar o servico.' : 'Nao foi possivel cadastrar o servico.';
      setError(message);
      throw new Error(message);
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
      const [nextServices, nextCategories] = await Promise.all([
        listarServicos(prestador.id),
        listarMinhasCategoriasPrestadorSeguro(),
      ]);
      setServicos(nextServices);
      setCategorias(nextCategories);
    } catch {
      setError('Nao foi possivel remover o servico.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSchedule(payload: { dia_semana: number; hora_inicio: string; hora_fim: string }[]) {
    if (!prestador) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      await criarHorariosLote(prestador.id, payload);
      setScheduleModalVisible(false);
      setHorarios(await listarHorarios(prestador.id));
    } catch (error) {
      throw new Error(scheduleErrorMessage(error));
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

  return (
    <ProfileScreenContent
      title="Meu estabelecimento"
      subtitle="Gerencie seus dados e serviços."
      appearance="customer"
      onSignOut={signOut}
    >
      {loading ? (
      <LoadingIndicator text="Carregando dados do estabelecimento..." />
      ) : !prestador ? (
        <Card appearance="customer" style={styles.formCard}>
          <Text style={styles.title}>Cadastro profissional indisponível</Text>
          <Text style={styles.cardText}>
            Não foi possível localizar o cadastro aprovado desta conta. Atualize a sessão e tente novamente.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button appearance="customer" title="Tentar novamente" onPress={loadProviderProfile} />
        </Card>
      ) : (
        <View style={[styles.profileLayout, width >= 900 && styles.profileLayoutDesktop]}>
          <View style={[styles.profileColumn, width >= 900 && styles.profileColumnDesktop]}>
          <Text style={styles.sectionTitle}>Estabelecimento</Text>
          <Card appearance="customer" style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardSectionTitle}>Dados do estabelecimento</Text>
              {!editingEstablishment ? (
                <Button appearance="customer" title="Editar" size="sm" variant="secondary" onPress={() => setEditingEstablishment(true)} />
              ) : null}
            </View>

            {editingEstablishment ? (
              <>
                <Input appearance="customer"
                  label="Nome do estabelecimento"
                  placeholder="Diego BarberShop"
                  value={nomeEstab}
                  onChangeText={setNomeEstab}
                />
                <Input appearance="customer" label="CPF/CNPJ" placeholder="00.000.000/0000-00" value={documento} onChangeText={setDocumento} />
                <Text style={styles.cardSectionTitle}>Localizacao</Text>
                <Input appearance="customer" label="Endereco" placeholder="Rua Principal" value={endereco} onChangeText={setEndereco} />
                <Input appearance="customer" label="Numero" placeholder="123" value={numero} onChangeText={setNumero} />
                <Input appearance="customer" label="Bairro" placeholder="Centro" value={bairro} onChangeText={setBairro} />
                <Input appearance="customer" label="Cidade" placeholder="Pau dos Ferros" value={cidade} onChangeText={setCidade} />
                <Input appearance="customer"
                  label="Estado"
                  placeholder="RN"
                  value={estado}
                  onChangeText={(value) => setEstado(value.toUpperCase())}
                />
                <Input appearance="customer"
                  label="Complemento"
                  placeholder="Sala, bloco ou referencia"
                  value={complemento}
                  onChangeText={setComplemento}
                />
                <View style={styles.editActions}>
                  <Button appearance="customer" title="Cancelar" size="sm" variant="secondary" onPress={handleCancelEditEstablishment} disabled={saving} />
                  <Button appearance="customer" title="Salvar" size="sm" onPress={handleUpdatePrestador} loading={saving} />
                </View>
              </>
            ) : (
              <>
                <View style={styles.providerPhotoRow}>
                  <CatalogImage fotoUrl={withImageVersion(prestador.foto_url, providerPhotoVersion)} kind="provider" style={styles.providerPhoto} />
                  <View style={styles.providerPhotoContent}>
                    <Text style={styles.providerPhotoTitle}>Foto do estabelecimento</Text>
                    <Button appearance="customer"
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

          <Text style={styles.sectionTitle}>Gestão</Text>
          <Card appearance="customer" style={styles.metricsCard}>
            <MetricItem icon="category" label="Categorias" value={String(categorias.length)} />
            <MetricItem icon="content-cut" label="Serviços" value={String(servicos.length)} />
            <MetricItem icon="schedule" label="Horários" value={String(horarios.length)} />
          </Card>

          <View style={styles.galeriaHeader}>
            <Text style={styles.sectionTitle}>Galeria de fotos ({fotos.length}/{MAX_FOTOS_GALERIA})</Text>
            <Button appearance="customer" title="Adicionar foto" size="sm" variant="secondary"
              onPress={handleAddGaleriaFoto} loading={uploadingFoto}
              disabled={fotos.length >= MAX_FOTOS_GALERIA || removingFotoId !== null} />
          </View>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={fotos}
            keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.galeriaList}
            renderItem={({ item }) => (
              <View style={styles.galeriaItem}>
                <CatalogImage fotoUrl={item.foto_url} kind="provider" style={styles.galeriaFoto} />
                <Pressable accessibilityRole="button" accessibilityLabel="Remover foto da galeria"
                  style={styles.galeriaRemove} onPress={() => handleRemoveGaleriaFoto(item.id)}
                  disabled={removingFotoId !== null || uploadingFoto}>
                  <ProviderIcon name="close" color={C.danger} size={18} />
                </Pressable>
              </View>
            )}
            ListFooterComponent={fotos.length < MAX_FOTOS_GALERIA ? (
              <Pressable accessibilityRole="button" style={styles.galeriaAdd} onPress={handleAddGaleriaFoto}
                disabled={uploadingFoto || removingFotoId !== null}>
                <ProviderIcon name="add" color={C.primary} size={24} />
                <Text style={styles.galeriaAddText}>Adicionar</Text>
              </Pressable>
            ) : null} />
          <Text style={styles.galeriaHelp}>Opcional. Adicione até 8 fotos para mostrar seu espaço aos clientes.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          </View>
          <View style={[styles.profileColumn, width >= 900 && styles.profileColumnDesktop]}>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorias</Text>
          </View>

          {categorias.length ? (
            <View style={styles.chips}>
              {categorias.map((categoria) => (
                <View key={categoria.id} style={styles.chip}>
                  <Text style={styles.chipText}>{categoria.nome}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Card appearance="customer">
              <Text style={styles.cardText}>As categorias aparecerao aqui conforme os servicos cadastrados.</Text>
            </Card>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Horarios cadastrados</Text>
            <Button appearance="customer" title="Adicionar" size="sm" onPress={() => setScheduleModalVisible(true)} />
          </View>

          {horariosPorDia.map((grupo) => (
            <Card appearance="customer" key={grupo.dia} style={styles.listCard}>
              <Text style={styles.cardTitle}>{grupo.nome}</Text>
              {grupo.intervalos.map((horario) => (
                <View key={horario.id} style={styles.scheduleIntervalRow}>
                  <Text style={styles.scheduleTime}>{horaCurta(horario.hora_inicio)} – {horaCurta(horario.hora_fim)}</Text>
                  <Pressable accessibilityRole="button"
                    accessibilityLabel={`Remover horário de ${grupo.nome}, ${horaCurta(horario.hora_inicio)} a ${horaCurta(horario.hora_fim)}`}
                    style={styles.scheduleRemove} onPress={() => handleRemoveSchedule(horario.id)} disabled={saving}>
                    <ProviderIcon name="close" color={C.danger} size={18} />
                  </Pressable>
                </View>
              ))}
            </Card>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Servicos cadastrados</Text>
            <Button appearance="customer" title="Cadastrar" size="sm" onPress={handleOpenCreateService} />
          </View>

          {servicos.map((servico) => (
            <Card appearance="customer" key={servico.id} style={styles.listCard}>
              <View style={styles.serviceRow}>
                <View style={styles.serviceIdentity}>
                  <CatalogImage
                    fotoUrl={withImageVersion(servico.foto_url, servicePhotoVersions[servico.id])}
                    kind="service"
                    style={styles.servicePhoto}
                  />
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle}>{servico.nome}</Text>
                    <Text style={styles.serviceDescription}>
                      R$ {servico.preco.toFixed(2)} · {servico.duracao_min} min
                    </Text>
                  </View>
                </View>
                <View style={styles.serviceActions}>
                  <Button appearance="customer" title="Editar" size="sm" variant="secondary" onPress={() => handleOpenEditService(servico)} disabled={saving} />
                  <Button appearance="customer" title="Remover" size="sm" variant="outline" onPress={() => handleRemoveService(servico.id)} disabled={saving} />
                </View>
              </View>
            </Card>
          ))}
          </View>
        </View>
      )}

      <ProviderServiceModal
        appearance="customer"
        visible={serviceModalVisible}
        loading={saving}
        categories={categoriasAtivas}
        initialService={editingService}
        onClose={handleCloseServiceModal}
        onSave={handleSaveService}
      />
      <ProviderScheduleModal
        appearance="customer"
        visible={scheduleModalVisible}
        loading={saving}
        existingHorarios={horarios}
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
  profileLayout: { gap: 24 },
  profileLayoutDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
  profileColumn: { gap: 16, minWidth: 0, width: '100%' },
  profileColumnDesktop: { flex: 1, width: 'auto' },
  title: {
    color: C.text,
    fontFamily: C.fontDisplay,
    fontSize: 22,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  metricsCard: {
    borderWidth: 0,
    borderRadius: 24,
    paddingVertical: 18,
    ...customerTheme.shadow,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.xs,
  },
  metricValue: {
    color: C.text,
    fontFamily: C.fontDisplay,
    fontSize: 27,
  },
  metricLabel: {
    color: C.textMuted,
    fontFamily: C.fontBody,
    fontSize: 14,
  },
  detailsCard: {
    borderWidth: 0,
    borderRadius: 24,
    gap: 14,
    minWidth: 0,
    padding: 16,
    ...customerTheme.shadow,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
  },
  cardSectionTitle: {
    color: C.text,
    flex: 1,
    fontFamily: C.fontDisplay,
    fontSize: 18,
  },
  editActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  providerPhotoRow: {
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  providerPhoto: {
    borderRadius: 38,
    height: 76,
    width: 76,
  },
  providerPhotoContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  providerPhotoTitle: {
    color: C.text,
    fontFamily: C.fontBodySemi,
    fontSize: 15,
  },
  infoRow: {
    backgroundColor: C.bg,
    borderRadius: 16,
    gap: 4,
    padding: 12,
  },
  infoLabel: {
    color: C.textMuted,
    fontFamily: C.fontBody,
    fontSize: 14,
  },
  infoValue: {
    color: C.text,
    fontFamily: C.fontBodySemi,
    fontSize: 16,
    lineHeight: 22,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: C.text,
    flex: 1,
    fontFamily: C.fontDisplay,
    fontSize: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: C.lilac,
    borderRadius: theme.borderRadius.pill,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chipText: {
    color: C.primary,
    fontFamily: C.fontBodySemi,
    fontSize: 15,
  },
  listCard: {
    borderWidth: 0,
    borderRadius: 20,
    gap: 8,
    padding: 14,
    ...customerTheme.shadow,
  },
  scheduleIntervalRow: {
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 6,
  },
  scheduleTime: { color: C.text, fontFamily: C.fontBodySemi, fontSize: 16 },
  scheduleRemove: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  listRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  serviceRow: {
    gap: 12,
    width: '100%',
  },
  serviceIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  serviceInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  serviceTitle: {
    color: C.text,
    fontFamily: C.fontDisplay,
    fontSize: 18,
  },
  serviceDescription: {
    color: C.textMuted,
    fontFamily: C.fontBody,
    fontSize: 15,
    lineHeight: 21,
  },
  servicePhoto: {
    borderRadius: theme.borderRadius.md,
    height: 72,
    width: 72,
  },
  serviceActions: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  galeriaHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  galeriaList: { gap: 12, paddingVertical: 4 },
  galeriaItem: { position: 'relative' },
  galeriaFoto: { borderRadius: 18, height: 120, width: 120 },
  galeriaRemove: {
    alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, height: 30,
    justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 30,
  },
  galeriaAdd: {
    alignItems: 'center', backgroundColor: C.lilac, borderColor: C.primary,
    borderRadius: 18, borderStyle: 'dashed', borderWidth: 1, gap: 6,
    height: 120, justifyContent: 'center', width: 120,
  },
  galeriaAddText: { color: C.primary, fontFamily: C.fontBodySemi, fontSize: 14 },
  galeriaHelp: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 14, lineHeight: 20 },
  cardTitle: {
    color: C.text,
    flex: 1,
    fontFamily: C.fontDisplay,
    fontSize: 18,
  },
  cardText: {
    color: C.textMuted,
    flex: 1,
    fontFamily: C.fontBody,
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    color: C.danger,
    fontFamily: C.fontBodySemi,
    fontSize: 15,
  },
});
