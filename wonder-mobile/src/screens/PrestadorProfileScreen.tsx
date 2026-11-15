import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { RatingStars } from '../components/catalog/RatingStars';
import { ServiceCard } from '../components/catalog/ServiceCard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import { listarAvaliacoesPrestador } from '../services/avaliacoes';
import {
  listarCategoriasPrestador, listarFotosEstabelecimento, listarHorariosPrestador,
  listarServicosPrestador, obterPrestador,
} from '../services/catalogo';
import { customerTheme } from '../styles/customerTheme';
import { Avaliacao } from '../types/avaliacao';
import { Categoria, DIAS_SEMANA, FotoEstabelecimento, Horario, Prestador, Servico } from '../types/catalogo';
import { atendeHoje } from '../utils/catalogPresentation';
import { calcularMediaAvaliacoes } from '../utils/avaliacoes';

type PrestadorProfileRouteProp = {
  key: string;
  name: 'PrestadorProfile';
  params: SearchStackParamList['PrestadorProfile'];
};
type Navigation = NativeStackNavigationProp<SearchStackParamList, 'PrestadorProfile'>;

export function PrestadorProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PrestadorProfileRouteProp>();
  const insets = useSafeAreaInsets();
  const { prestadorId } = route.params;
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [fotos, setFotos] = useState<FotoEstabelecimento[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [aba, setAba] = useState<'sobre' | 'horarios'>('sobre');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const [prestadorData, servicosData, horariosData, categoriasData, fotosData, avaliacoesData] =
          await Promise.all([
            obterPrestador(prestadorId), listarServicosPrestador(prestadorId), listarHorariosPrestador(prestadorId),
            listarCategoriasPrestador(prestadorId), listarFotosEstabelecimento(prestadorId),
            listarAvaliacoesPrestador(prestadorId).catch(() => []),
          ]);
        if (!ativo) return;
        setPrestador(prestadorData);
        setServicos(servicosData);
        setHorarios(horariosData);
        setCategorias(categoriasData);
        setFotos(fotosData);
        setAvaliacoes(avaliacoesData);
      } catch {
        if (ativo) setErro('Não foi possível carregar os dados do prestador.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => { ativo = false; };
  }, [prestadorId]);

  if (carregando) return <LoadingIndicator text="Carregando prestador..." />;
  if (erro || !prestador) {
    return (
      <View style={[styles.errorScreen, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
        <DetailHeader title="Estabelecimento" onBack={() => navigation.goBack()} />
        <Card><Text style={styles.secondaryText}>{erro || 'Prestador não encontrado.'}</Text></Card>
      </View>
    );
  }

  const endereco = formatAddress(prestador);
  const temEndereco = hasAddress(prestador);
  const media = calcularMediaAvaliacoes(avaliacoes);
  const banner = fotos[0]?.foto_url || prestador.foto_url;
  const categoriasTexto = categorias.map((item) => item.nome).join(', ') || 'Categorias não informadas';
  const localidade = [prestador.cidade, prestador.estado].filter(Boolean).join('/') || 'Local não informado';
  const disponivelHoje = atendeHoje(horarios);

  function openMaps() {
    if (!temEndereco) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.replace(/\n/g, ', '))}`);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 6 }]}>
        <DetailHeader title={prestador.nome_estab} onBack={() => navigation.goBack()} />
        <CatalogImage fotoUrl={banner} kind="provider" style={styles.hero} />

        <View style={styles.summaryCard}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.establishmentName} numberOfLines={1}>{prestador.nome_estab}</Text>
            {avaliacoes.length ? <Text style={styles.ratingText}>★ {media.toFixed(1)}</Text> : null}
          </View>
          <Text style={styles.secondaryText} numberOfLines={1}>{categoriasTexto} · {localidade}</Text>
          <Text style={styles.availability}>{disponivelHoje ? 'Aberto hoje' : 'Confira os horários disponíveis'}</Text>
        </View>

        <View style={styles.tabs}>
          <Tab active={aba === 'sobre'} label="Sobre" onPress={() => setAba('sobre')} />
          <Tab active={aba === 'horarios'} label="Horários disponíveis" onPress={() => setAba('horarios')} />
        </View>

        {aba === 'sobre' ? <>
          <View style={styles.infoCard}>
            <Text style={styles.cardLabel}>Localização</Text>
            <Text style={styles.cardValue}>{temEndereco ? endereco.replace(/\n/g, ' · ') : 'Endereço não informado.'}</Text>
            {temEndereco ? (
              <Pressable accessibilityRole="link" onPress={openMaps}><Text style={styles.link}>Abrir no mapa</Text></Pressable>
            ) : null}
          </View>

          <Pressable style={styles.primaryButton}
            onPress={() => navigation.navigate('Agendamento', { prestadorId: prestador.id })}>
            <Text style={styles.primaryButtonText}>Agendar serviço</Text>
          </Pressable>

          <Text style={styles.sectionTitle}>Avaliações</Text>
          <View style={styles.infoCard}>
            {avaliacoes.length ? (
              <View style={styles.ratingSummary}>
                <Text style={styles.ratingValue}>{media.toFixed(1)}</Text>
                <View style={styles.ratingDetails}>
                  <RatingStars value={media} size={22} />
                  <Text style={styles.secondaryText}>{avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}</Text>
                </View>
              </View>
            ) : <Text style={styles.secondaryText}>Este prestador ainda não possui avaliações.</Text>}
          </View>

          {fotos.length > 1 ? <>
            <Text style={styles.sectionTitle}>Fotos do estabelecimento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {fotos.slice(1).map((foto) => <CatalogImage key={foto.id} fotoUrl={foto.foto_url} kind="provider" style={styles.galleryImage} />)}
            </ScrollView>
          </> : null}

          <Text style={styles.sectionTitle}>Serviços oferecidos</Text>
          {servicos.length ? <View style={styles.list}>{servicos.map((item) => <ServiceCard key={item.id} servico={item} />)}</View>
            : <View style={styles.infoCard}><Text style={styles.secondaryText}>Nenhum serviço cadastrado ainda.</Text></View>}
        </> : (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Horários de funcionamento</Text>
            {horarios.length ? horarios.map((horario) => (
              <View key={horario.id} style={styles.scheduleRow}>
                <Text style={styles.scheduleDay}>{DIAS_SEMANA[horario.dia_semana] ?? `Dia ${horario.dia_semana}`}</Text>
                <Text style={styles.scheduleTime}>{horario.hora_inicio.slice(0, 5)} às {horario.hora_fim.slice(0, 5)}</Text>
              </View>
            )) : <Text style={styles.secondaryText}>Nenhum horário cadastrado ainda.</Text>}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Voltar" onPress={onBack} style={styles.backButton}>
        <MaterialIcons name="chevron-left" size={28} color={customerTheme.colors.brandDark} />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function hasAddress(prestador: Prestador) {
  return Boolean(prestador.endereco?.trim() || prestador.numero?.trim() || prestador.bairro?.trim()
    || prestador.cidade?.trim() || prestador.estado?.trim());
}

function formatAddress(prestador: Prestador) {
  const linhaEndereco = [prestador.endereco, prestador.numero].filter(Boolean).join(', ');
  const linhaCidade = [prestador.cidade, prestador.estado].filter(Boolean).join(' - ');
  return [linhaEndereco, prestador.bairro, linhaCidade].filter(Boolean).join('\n');
}

const styles = StyleSheet.create({
  screen: { backgroundColor: customerTheme.colors.background, flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: { alignSelf: 'center', flexGrow: 1, gap: 12, maxWidth: 560, paddingBottom: 110, paddingHorizontal: 20, width: '100%' },
  errorScreen: { backgroundColor: customerTheme.colors.background, flex: 1, gap: 16, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 56 },
  backButton: {
    alignItems: 'center', backgroundColor: customerTheme.colors.surface, borderRadius: 20, height: 40,
    justifyContent: 'center', width: 40, ...customerTheme.shadow,
  },
  headerTitle: { color: customerTheme.colors.text, flex: 1, fontSize: 18, fontWeight: '800' },
  hero: { borderRadius: customerTheme.radius.image, height: 144, width: '100%' },
  summaryCard: { backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card, gap: 6, padding: 14, ...customerTheme.shadow },
  summaryTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  establishmentName: { color: customerTheme.colors.text, flex: 1, fontSize: 18, fontWeight: '800' },
  ratingText: { color: customerTheme.colors.brandDark, fontSize: 13, fontWeight: '600' },
  secondaryText: { color: customerTheme.colors.textSecondary, fontSize: 12 },
  availability: { color: customerTheme.colors.brand, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.pill, minHeight: 36, justifyContent: 'center', paddingHorizontal: 14 },
  tabActive: { backgroundColor: customerTheme.colors.brandDark },
  tabText: { color: customerTheme.colors.text, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: customerTheme.colors.textOnBrand },
  infoCard: { backgroundColor: customerTheme.colors.surface, borderRadius: customerTheme.radius.card, gap: 6, padding: 14, ...customerTheme.shadow },
  cardLabel: { color: customerTheme.colors.textSecondary, fontSize: 11 },
  cardValue: { color: customerTheme.colors.text, fontSize: 14, fontWeight: '600' },
  link: { color: customerTheme.colors.brand, fontSize: 12, fontWeight: '600' },
  primaryButton: { alignItems: 'center', backgroundColor: customerTheme.colors.brand, borderRadius: customerTheme.radius.pill, height: 48, justifyContent: 'center' },
  primaryButtonText: { color: customerTheme.colors.textOnBrand, fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: customerTheme.colors.text, fontSize: 17, fontWeight: '800', marginTop: 4 },
  ratingSummary: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  ratingValue: { color: customerTheme.colors.text, fontSize: 32, fontWeight: '800' },
  ratingDetails: { gap: 4 },
  gallery: { gap: 10 },
  galleryImage: { borderRadius: 18, height: 104, width: 148 },
  list: { gap: 10 },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 34 },
  scheduleDay: { color: customerTheme.colors.text, fontSize: 13, fontWeight: '600' },
  scheduleTime: { color: customerTheme.colors.textSecondary, fontSize: 13 },
});
