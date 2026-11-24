import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { CatalogImage } from '../components/catalog/CatalogImage';
import { RatingStars } from '../components/catalog/RatingStars';
import { ServiceCard } from '../components/catalog/ServiceCard';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SearchStackParamList } from '../navigation/SearchStack';
import { useResetScrollOnFocus } from '../navigation/useResetScrollOnFocus';
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
  const scrollRef = useRef<ScrollView>(null);
  useResetScrollOnFocus(scrollRef);
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PrestadorProfileRouteProp>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { prestadorId } = route.params;
  const [prestador, setPrestador] = useState<Prestador | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [fotos, setFotos] = useState<FotoEstabelecimento[]>([]);
  const [aba, setAba] = useState<'sobre' | 'horarios'>('sobre');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const [prestadorData, servicosData, horariosData, categoriasData, avaliacoesData, fotosData] =
          await Promise.all([
            obterPrestador(prestadorId), listarServicosPrestador(prestadorId), listarHorariosPrestador(prestadorId),
            listarCategoriasPrestador(prestadorId),
            listarAvaliacoesPrestador(prestadorId).catch(() => []),
            listarFotosEstabelecimento(prestadorId).catch(() => []),
          ]);
        if (!ativo) return;
        setPrestador(prestadorData);
        setServicos(servicosData);
        setHorarios(horariosData);
        setCategorias(categoriasData);
        setAvaliacoes(avaliacoesData);
        setFotos(fotosData);
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
  const banner = prestador.foto_url;
  const categoriasTexto = categorias.map((item) => item.nome).join(', ') || 'Categorias não informadas';
  const localidade = [prestador.cidade, prestador.estado].filter(Boolean).join('/') || 'Local não informado';
  const disponivelHoje = atendeHoje(horarios);

  function openMaps() {
    if (!temEndereco) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.replace(/\n/g, ', '))}`);
  }

  return (
    <View style={styles.screen}>
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroWrap}>
        <CatalogImage fotoUrl={banner} kind="provider" style={styles.hero} />
        <View style={[styles.heroBack, { top: desktop ? 28 : Math.max(insets.top, 56) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={26} color={customerTheme.v4.text} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.sheet, desktop && styles.sheetDesktop]}>
      <View style={styles.logoWrap}><CatalogImage fotoUrl={prestador.foto_url} kind="provider" style={styles.logo} /></View>
      <View style={[styles.container, desktop && styles.containerDesktop]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.establishmentName} numberOfLines={1}>{prestador.nome_estab}</Text>
            {avaliacoes.length ? <Text style={styles.ratingText}>★ {media.toFixed(1).replace('.', ',')}</Text> : null}
          </View>
          <Text style={styles.secondaryText} numberOfLines={1}>{categoriasTexto} · {localidade}</Text>
          <Text style={styles.availability}>{disponivelHoje ? '● Aberto hoje' : 'Confira os horários disponíveis'}</Text>
        </View>

        <View style={styles.tabs}>
          <Tab active={aba === 'sobre'} label="Sobre" onPress={() => setAba('sobre')} />
          <Tab active={aba === 'horarios'} label="Horários disponíveis" onPress={() => setAba('horarios')} />
        </View>

        {aba === 'sobre' ? <>
          {fotos.length > 0 ? <>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
              {fotos.map((foto) => <CatalogImage key={foto.id} fotoUrl={foto.foto_url}
                kind="provider" style={styles.galleryImage} />)}
            </ScrollView>
          </> : null}

          <Text style={styles.sectionTitle}>Serviços</Text>
          {servicos.length ? <View style={styles.list}>{servicos.map((item) => <ServiceCard key={item.id} servico={item} />)}</View>
            : <View style={styles.infoCard}><Text style={styles.secondaryText}>Nenhum serviço cadastrado ainda.</Text></View>}
          <Text style={styles.sectionTitle}>Localização</Text>
          <View style={styles.infoCard}>
            <Text style={styles.cardValue}>{temEndereco ? endereco.replace(/\n/g, ' · ') : 'Endereço não informado.'}</Text>
            {temEndereco ? <Pressable accessibilityRole="link" onPress={openMaps}><Text style={styles.link}>Abrir no mapa</Text></Pressable> : null}
          </View>
          {avaliacoes.length > 0 ? <>
          <Text style={styles.sectionTitle}>Avaliações</Text>
          <View style={styles.infoCard}>
            <View style={styles.ratingSummary}>
              <Text style={styles.ratingValue}>{media.toFixed(1).replace('.', ',')}</Text>
              <View style={styles.ratingDetails}><RatingStars value={media} size={22} />
                <Text style={styles.secondaryText}>{avaliacoes.length} {avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}</Text></View>
            </View>
          </View>
          </> : null}
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
      </View>
    </ScrollView>
    <View style={[styles.footer, { marginBottom: desktop ? 0 : 86 + insets.bottom }]}><Pressable accessibilityRole="button" style={styles.primaryButton}
      onPress={() => navigation.navigate('Agendamento', { prestadorId: prestador.id })}>
      <Text style={styles.primaryButtonText}>Agendar serviço</Text>
    </Pressable></View>
    </View>
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
  screen: { backgroundColor: customerTheme.v4.bg, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  heroWrap: { height: 264 },
  heroBack: { left: 20, position: 'absolute' },
  sheet: { backgroundColor: customerTheme.v4.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 1, marginTop: -28, paddingTop: 50 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, paddingTop: 58 },
  container: { alignSelf: 'center', flexGrow: 1, gap: 18, maxWidth: 560, paddingBottom: 150, paddingHorizontal: 20, width: '100%' },
  containerDesktop: { maxWidth: 1100, paddingHorizontal: 76 },
  logoWrap: { backgroundColor: '#FFF', borderRadius: 44, height: 88, left: 20, padding: 4, position: 'absolute', top: -44, width: 88 },
  logo: { borderRadius: 40, height: 80, width: 80 },
  errorScreen: { backgroundColor: customerTheme.colors.background, flex: 1, gap: 16, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 56 },
  backButton: {
    alignItems: 'center', backgroundColor: '#FFF', borderRadius: 22, height: 44,
    justifyContent: 'center', width: 44, ...customerTheme.shadow,
  },
  headerTitle: { color: customerTheme.colors.text, flex: 1, fontSize: 18, fontWeight: '800' },
  hero: { height: 264, width: '100%' },
  summaryCard: { gap: 6 },
  summaryTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  establishmentName: { color: customerTheme.v4.text, flex: 1, fontFamily: customerTheme.v4.fontDisplay, fontSize: 26 },
  ratingText: { backgroundColor: '#FFF0D6', borderRadius: 16, color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodyBold, fontSize: 14, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  secondaryText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBody, fontSize: 15 },
  availability: { color: customerTheme.v4.success, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  tabs: { backgroundColor: customerTheme.v4.field, borderRadius: 26, flexDirection: 'row', gap: 4, height: 52, padding: 4 },
  tab: { alignItems: 'center', borderRadius: 22, flex: 1, justifyContent: 'center' },
  tabActive: { backgroundColor: '#FFF', ...customerTheme.shadow },
  tabText: { color: customerTheme.v4.textMuted, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  tabTextActive: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodyBold },
  infoCard: { backgroundColor: '#FFF', borderRadius: 24, gap: 8, padding: 16, ...customerTheme.shadow },
  cardLabel: { color: customerTheme.colors.textSecondary, fontSize: 11 },
  cardValue: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 16 },
  link: { color: customerTheme.v4.primary, fontFamily: customerTheme.v4.fontBodySemi, fontSize: 15 },
  footer: { backgroundColor: '#FFF', paddingBottom: 18, paddingHorizontal: 20, paddingTop: 16, ...customerTheme.shadow },
  primaryButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: customerTheme.v4.primary, borderRadius: 28, height: 56, justifyContent: 'center', maxWidth: 560, width: '100%' },
  primaryButtonText: { color: '#FFF', fontFamily: customerTheme.v4.fontBodySemi, fontSize: 17 },
  sectionTitle: { color: customerTheme.v4.text, fontFamily: customerTheme.v4.fontDisplay, fontSize: 22, marginTop: 4 },
  ratingSummary: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  ratingValue: { color: customerTheme.colors.text, fontSize: 32, fontWeight: '800' },
  ratingDetails: { gap: 4 },
  gallery: { gap: 10 },
  galleryImage: { borderRadius: 18, height: 120, width: 120 },
  list: { gap: 10 },
  scheduleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 34 },
  scheduleDay: { color: customerTheme.colors.text, fontSize: 13, fontWeight: '600' },
  scheduleTime: { color: customerTheme.colors.textSecondary, fontSize: 13 },
});
