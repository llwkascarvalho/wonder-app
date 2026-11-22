import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatalogImage } from '../components/catalog/CatalogImage';
import { CustomerHomeSkeleton } from '../components/customer/CustomerHomeSkeleton';
import { HeroGlows } from '../components/customer/HeroGlows';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import type { MainTabsParamList } from '../navigation/MainTabs';
import type { SearchStackParamList } from '../navigation/SearchStack';
import { listarCategorias, listarPrestadores } from '../services/catalogo';
import { getProfilePhoto } from '../services/profileService';
import { customerTheme } from '../styles/customerTheme';
import { Categoria } from '../types/catalogo';
import { carregarCardsPrestadores, ProviderCardModel } from '../utils/catalogPresentation';

const C = customerTheme.v4;
const tones: Record<string, [string, string]> = {
  barba: ['#3B2A24', '#D2B08A'], unhas: ['#D98AA6', '#FBE3EA'],
  cabelo: ['#6E3B22', '#E8B98A'], spa: ['#4F7F6F', '#E3F0EA'],
};
function toneFor(name: string): [string, string] {
  const value = name.toLowerCase();
  return tones[Object.keys(tones).find((key) => value.includes(key)) || 'spa'];
}
function fallbackStyle(name: string) {
  const [start, end] = toneFor(name);
  return Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(135deg, ${start}, ${end})` } as any) : { backgroundColor: start };
}
function ImageOrTone({ url, kind, name, style }: { url?: string | null; kind: 'category' | 'provider'; name: string; style: any }) {
  return <View style={[style, fallbackStyle(name)]}>
    {url ? <CatalogImage fotoUrl={url} kind={kind} style={styles.fill} /> :
      <Text style={styles.fallbackInitial}>{kind === 'provider' ? name.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase() : '✦'}</Text>}
  </View>;
}
function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHead}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action ? <Pressable onPress={onAction} accessibilityRole="button"><Text style={styles.sectionLink}>{action}</Text></Pressable> : null}
  </View>;
}
export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SearchStackParamList, 'HomeRoot'>>();
  const tabs = navigation.getParent<BottomTabNavigationProp<MainTabsParamList>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { usuario } = useAuth();
  const { unreadCount } = useNotifications();
  const tablet = width >= 640, desktop = width >= 900, wide = width >= 1280;
  const gutter = desktop ? 40 : tablet ? 32 : 20;
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<number | null>(null);
  const [prestadores, setPrestadores] = useState<ProviderCardModel[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [carregandoPrestadores, setCarregandoPrestadores] = useState(true);
  const [erroCategorias, setErroCategorias] = useState<string | null>(null);
  const [erroPrestadores, setErroPrestadores] = useState<string | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setFotoPerfil(undefined);
    if (usuario?.foto_url) getProfilePhoto(usuario.foto_url).then(uri => {
      objectUrl = uri; if (active) setFotoPerfil(uri);
    }).catch(() => undefined);
    return () => { active = false; if (Platform.OS === 'web' && objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl); };
  }, [usuario?.foto_url]);
  useEffect(() => {
    const controller = new AbortController();
    listarCategorias(controller.signal).then(data => {
      if (!controller.signal.aborted) { setCategorias(data); setErroCategorias(null); }
    }).catch(() => {
      if (!controller.signal.aborted) setErroCategorias('Não foi possível carregar as categorias.');
    }).finally(() => { if (!controller.signal.aborted) setCarregandoCategorias(false); });
    return () => controller.abort();
  }, []);
  const carregar = useCallback(async (signal: AbortSignal) => {
    setCarregandoPrestadores(true);
    setErroPrestadores(null);
    try {
      const data = await listarPrestadores({ categoria_id: categoriaSelecionada ?? undefined }, signal);
      const cards = await carregarCardsPrestadores(data, signal);
      if (!signal.aborted) setPrestadores(cards);
    } catch {
      if (!signal.aborted) setErroPrestadores('Não foi possível carregar os prestadores.');
    } finally { if (!signal.aborted) setCarregandoPrestadores(false); }
  }, [categoriaSelecionada]);
  useEffect(() => {
    const controller = new AbortController();
    carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);
  const openProvider = (id: number) => navigation.navigate('PrestadorProfile', { prestadorId: id });
  const name = usuario?.nome?.trim().split(/\s+/)[0] || 'Cliente';
  const cards = prestadores.slice(0, 8);
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, desktop ? 44 : tablet ? 28 : 20), paddingBottom: desktop ? 76 : 56 }]}>
        <HeroGlows desktop={desktop} />
        <View style={[styles.wrap, { paddingHorizontal: gutter, maxWidth: desktop ? 1120 : 784 }]}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>{fotoPerfil ? <Image source={{ uri: fotoPerfil }} style={styles.fill} /> : <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>}</View>
            <View style={styles.identity}><Text style={styles.greeting}>Olá, {name}!</Text><Text style={styles.role}>Cliente Wonder</Text></View>
            <Pressable style={styles.bell} onPress={() => tabs?.navigate('Notifications')} accessibilityLabel="Notificações" accessibilityRole="button">
              <Ionicons name="notifications-outline" size={24} color="#FFF" />
              {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
            </Pressable>
          </View>
          <Text style={[styles.heroTitle, desktop && styles.heroTitleLarge]}>Sua beleza em{'\n'}boas mãos!</Text>
          <Text style={styles.heroSub}>Serviços perto de você.</Text>
        </View>
      </View>
      <View style={[styles.sheet, { borderTopLeftRadius: desktop ? 40 : 28, borderTopRightRadius: desktop ? 40 : 28, marginTop: desktop ? -40 : -28, paddingTop: desktop ? 36 : 24, paddingBottom: desktop ? 72 : 150 }]}>
        <View style={[styles.wrap, styles.sections, { paddingHorizontal: gutter, maxWidth: desktop ? 1120 : 784, gap: desktop ? 36 : 22 }]}>
          {carregandoCategorias && carregandoPrestadores ? <CustomerHomeSkeleton /> : <>
            <View>
              <SectionTitle title="Categorias" action="Ver todas" onAction={() => tabs?.navigate('Search', { screen: 'SearchHome' })} />
              {erroCategorias ? <Text style={styles.notice}>{erroCategorias}</Text> : categorias.length === 0 ? <Text style={styles.notice}>Nenhuma categoria disponível.</Text> :
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.cats, tablet && styles.catsTablet]}>
                  {categorias.map(cat => <Pressable key={cat.id} onPress={() => setCategoriaSelecionada(categoriaSelecionada === cat.id ? null : cat.id)}
                    accessibilityRole="button" accessibilityState={{ selected: categoriaSelecionada === cat.id }} style={[styles.cat, { width: desktop ? 104 : tablet ? 88 : 76 }]}>
                    <View style={[styles.catCircle, { width: desktop ? 88 : tablet ? 76 : 64, height: desktop ? 88 : tablet ? 76 : 64 }, categoriaSelecionada === cat.id && styles.catSelected]}>
                      <ImageOrTone url={cat.foto_url} kind="category" name={cat.nome} style={styles.fill} />
                    </View><Text numberOfLines={2} style={[styles.catName, categoriaSelecionada === cat.id && styles.catNameSelected]}>{cat.nome}</Text>
                  </Pressable>)}
                </ScrollView>}
            </View>
            <View>
              <SectionTitle title="Para você" action="Ver todos" onAction={() => tabs?.navigate('Search', { screen: 'SearchHome' })} />
              {erroPrestadores ? <Text style={styles.notice}>{erroPrestadores}</Text> : cards.length === 0 ? <Text style={styles.notice}>Nenhum prestador encontrado.</Text> :
                desktop ? <View style={styles.featureGridInner}>
                  {cards.map(item => <FeatureCard key={item.prestador.id} item={item} onPress={() => openProvider(item.prestador.id)} columns={wide ? 4 : 3} />)}
                </View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={tablet ? 314 : 278} decelerationRate="fast" contentContainerStyle={styles.carousel}>
                  {cards.map(item => <FeatureCard key={item.prestador.id} item={item} onPress={() => openProvider(item.prestador.id)} width={tablet ? 300 : 264} />)}
                </ScrollView>}
            </View>
            <View>
              <SectionTitle title="Perto de você" />
              {erroPrestadores ? <Text style={styles.notice}>{erroPrestadores}</Text> : prestadores.length === 0 ? <Text style={styles.notice}>Nenhum prestador encontrado.</Text> :
                <View style={[styles.nearList, desktop && styles.nearGrid]}>
                  {prestadores.map((item, index) => <Pressable key={item.prestador.id} onPress={() => openProvider(item.prestador.id)}
                    style={[styles.nearItem, !desktop && index < prestadores.length - 1 && styles.nearDivider, desktop && styles.nearCell]}>
                    <ImageOrTone url={item.prestador.foto_url} kind="provider" name={item.prestador.nome_estab} style={styles.nearLogo} />
                    <View style={styles.nearText}><Text numberOfLines={1} style={styles.nearName}>{item.prestador.nome_estab}</Text>
                      <Text numberOfLines={2} style={styles.nearMeta}>{item.categorias.map(c => c.nome).join(', ') || 'Serviços'} · {[item.prestador.cidade, item.prestador.estado].filter(Boolean).join('/') || 'Local não informado'}</Text>
                    </View><Ionicons name="chevron-forward" size={20} color={C.textMuted} />
                  </Pressable>)}
                </View>}
            </View>
          </>}
        </View>
      </View>
    </ScrollView>
  </View>;
}

function FeatureCard({ item, onPress, width, columns }: { item: ProviderCardModel; onPress: () => void; width?: number; columns?: number }) {
  const p = item.prestador;
  const category = item.categorias[0]?.nome || 'Serviços';
  return <Pressable onPress={onPress} style={[styles.featureCard, width ? { width } : { width: columns === 4 ? '23.5%' : '31%' }]}>
    <ImageOrTone url={p.foto_url} kind="provider" name={p.nome_estab} style={styles.cover} />
    {item.avaliacao ? <View style={styles.ratingBadge}><Ionicons name="star" size={14} color={C.star} /><Text style={styles.ratingText}>{item.avaliacao.media.toFixed(1).replace('.', ',')}</Text></View> : null}
    <View style={styles.featureLogo}><ImageOrTone url={p.foto_url} kind="provider" name={p.nome_estab} style={styles.fill} /></View>
    <View style={styles.featureBody}><Text numberOfLines={2} style={styles.featureName}>{p.nome_estab}</Text>
      <Text numberOfLines={1} style={styles.featureMeta}>{category} · {[p.cidade, p.estado].filter(Boolean).join('/') || 'Local não informado'}</Text>
      <View style={styles.availability}><View style={[styles.availDot, item.atendeHoje !== true && styles.mutedDot]} /><Text style={[styles.availText, item.atendeHoje !== true && styles.mutedText]}>{item.atendeHoje ? 'Disponível hoje' : item.atendeHoje === false ? 'Sem mais atendimento hoje' : 'Horários indisponíveis'}</Text></View>
    </View>
  </Pressable>;
}

const shadow = Platform.OS === 'web' ? { boxShadow: C.shadowCard } as any : { elevation: 3, shadowColor: C.primaryDeep, shadowOffset: { width: 0, height: 6 }, shadowOpacity: .08, shadowRadius: 20 };
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, scroll: { flexGrow: 1 },
  wrap: { alignSelf: 'center', width: '100%' },
  hero: { backgroundColor: C.primary, overflow: 'hidden', position: 'relative' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(255,255,255,.5)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8D6A4F' },
  fill: { width: '100%', height: '100%' }, avatarText: { fontFamily: C.fontBodyBold, fontSize: 16, color: '#FFF' },
  identity: { flex: 1 }, greeting: { fontFamily: C.fontBodyBold, color: '#FFF', fontSize: 18 }, role: { fontFamily: C.fontBody, color: '#FFF', opacity: .8, fontSize: 14 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', right: 8, top: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  heroTitle: { fontFamily: C.fontDisplay, fontSize: 36, lineHeight: 40, color: '#FFF', marginTop: 18 }, heroTitleLarge: { fontSize: 52, lineHeight: 58, marginTop: 28 },
  heroSub: { fontFamily: C.fontBody, color: '#FFF', opacity: .85, fontSize: 17, marginTop: 6 },
  sheet: { backgroundColor: C.bg, flex: 1 }, sections: { flexDirection: 'column' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  sectionTitle: { fontFamily: C.fontDisplay, color: C.text, fontSize: 22, lineHeight: 27 }, sectionLink: { fontFamily: C.fontBodySemi, color: C.primary, fontSize: 15 },
  cats: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, catsTablet: { justifyContent: 'flex-start', gap: 30 },
  cat: { alignItems: 'center', gap: 8 }, catCircle: { borderRadius: 999, borderWidth: 3, borderColor: '#FFF', overflow: 'hidden', ...shadow },
  catSelected: { borderColor: C.primary }, catName: { fontFamily: C.fontBodySemi, fontSize: 15, color: C.text, textAlign: 'center' }, catNameSelected: { color: C.primary },
  fallbackInitial: { fontFamily: C.fontDisplay, color: '#FFF', fontSize: 22 },
  notice: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 16, paddingVertical: 12 },
  carousel: { gap: 14, paddingBottom: 18, paddingTop: 2, paddingRight: 20 },
  featureGridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  featureCard: { borderRadius: 22, backgroundColor: '#FFF', overflow: 'hidden', ...shadow }, cover: { height: 136, width: '100%' },
  ratingBadge: { position: 'absolute', left: 12, top: 12, backgroundColor: '#FFF', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5 },
  ratingText: { color: C.text, fontFamily: C.fontBodyBold, fontSize: 13 },
  featureLogo: { position: 'absolute', top: 110, left: 14, height: 52, width: 52, borderRadius: 26, borderWidth: 3, borderColor: '#FFF', overflow: 'hidden' },
  featureBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 30, gap: 3 }, featureName: { fontFamily: C.fontDisplay, fontSize: 18, lineHeight: 23, color: C.text },
  featureMeta: { fontFamily: C.fontBody, fontSize: 14, color: C.textMuted },
  availability: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }, availDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success },
  mutedDot: { backgroundColor: C.textMuted }, availText: { color: C.success, fontFamily: C.fontBodySemi, fontSize: 14 }, mutedText: { color: C.textMuted },
  nearList: { backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 2, ...shadow }, nearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 28 },
  nearItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }, nearCell: { width: '48%' },
  nearDivider: { borderBottomWidth: 1, borderBottomColor: C.border }, nearLogo: { width: 76, height: 76, borderRadius: 20, overflow: 'hidden' },
  nearText: { flex: 1, gap: 3 }, nearName: { color: C.text, fontFamily: C.fontDisplay, fontSize: 18, lineHeight: 23 },
  nearMeta: { color: C.textMuted, fontFamily: C.fontBody, fontSize: 14 },
});
