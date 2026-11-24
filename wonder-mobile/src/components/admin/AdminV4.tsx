import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroGlows } from '../customer/HeroGlows';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { customerTheme } from '../../styles/customerTheme';

export const A = customerTheme.v4;

export function AdminPage({ title, subtitle, back, search, onSearch, searchPlaceholder, children, wide = false, refreshing, onRefresh, accountName, accountPhotoUrl, accountPhotoRevision, onAccountPress }: {
  title: string; subtitle?: string; back?: () => void; search?: string; onSearch?: (value: string) => void;
  searchPlaceholder?: string; children: ReactNode; wide?: boolean; refreshing?: boolean; onRefresh?: () => void;
  accountName?: string; accountPhotoUrl?: string | null; accountPhotoRevision?: number; onAccountPress?: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 900;
  const contentWidth = wide ? 1040 : 720;
  return <ScrollView style={[s.page, desktop && { marginLeft: width >= 1280 ? 272 : 248 }]} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled"
    refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
    <View style={[s.hero, { paddingTop: Math.max(20, insets.top + 20) }, desktop && s.heroDesktop]}>
      <HeroGlows desktop={desktop} />
      <View style={[s.wrap, { maxWidth: contentWidth + (desktop ? 64 : 40) }]}>
        {back ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={back} style={s.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable> : null}
        {accountName ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir opções da conta" onPress={onAccountPress}
          disabled={!onAccountPress} style={s.account}>
          <View style={s.accountAvatar}><ProfileAvatar nome={accountName} fotoUrl={accountPhotoUrl} revision={accountPhotoRevision} size={44} /></View>
          <View style={s.accountText}><Text style={s.accountName}>{accountName}</Text><Text style={s.accountRole}>Painel Wonder</Text></View>
          {onAccountPress ? <Ionicons name="chevron-down" size={18} color="#fff" /> : null}
        </Pressable> : null}
        <Text style={[s.title, back && s.titleWithBack]}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        {onSearch ? <View style={s.searchBox}>
          <Ionicons name="search-outline" size={22} color={A.primary} />
          <TextInput accessibilityLabel="Buscar" placeholder={searchPlaceholder || 'Buscar por nome ou e-mail'} placeholderTextColor={A.textMuted}
            value={search} onChangeText={onSearch} style={s.searchInput} returnKeyType="search" />
        </View> : null}
      </View>
    </View>
    <View style={[s.sheet, desktop && s.sheetDesktop]}>
      <View style={[s.wrap, s.sheetContent, { maxWidth: contentWidth + (desktop ? 64 : 40) }]}>{children}</View>
    </View>
  </ScrollView>;
}

export function AdminChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[s.chip, active && s.chipActive]}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </Pressable>;
}

export function AdminAction({ label, accessibilityLabel, onPress, kind = 'primary', disabled, compact = false }: {
  label: string; accessibilityLabel?: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; compact?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.action, compact && s.actionCompact, kind === 'secondary' && s.actionSecondary,
      kind === 'danger' && s.actionDanger, disabled && s.disabled]}>
    <Text style={[s.actionText, kind === 'secondary' && s.actionSecondaryText, kind === 'danger' && s.actionDangerText]}>{label}</Text>
  </Pressable>;
}

export function AdminMessage({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <View style={[s.message, danger && s.messageDanger]}><Text style={[s.messageText, danger && s.messageDangerText]}>{children}</Text></View>;
}

export const adminV4 = StyleSheet.create({
  card: { backgroundColor: A.surface, borderRadius: 24, padding: 16, shadowColor: A.primaryDeep,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: .08, shadowRadius: 20, elevation: 3 },
  heading: { color: A.text, fontFamily: A.fontDisplay, fontSize: 22 },
  body: { color: A.text, fontFamily: A.fontBody, fontSize: 16, lineHeight: 23 },
  muted: { color: A.textMuted, fontFamily: A.fontBody, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  section: { gap: 12 },
});

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: A.bg }, pageContent: { flexGrow: 1 },
  hero: { backgroundColor: A.primary, paddingBottom: 56, overflow: 'hidden', minHeight: 170 },
  heroDesktop: { minHeight: 200, paddingBottom: 68 },
  wrap: { width: '100%', alignSelf: 'center', paddingHorizontal: 20 },
  title: { color: '#fff', fontFamily: A.fontDisplay, fontSize: 34, lineHeight: 39, marginTop: 6 },
  titleWithBack: { fontSize: 27, lineHeight: 33 },
  subtitle: { color: '#fff', opacity: .86, fontFamily: A.fontBody, fontSize: 17, lineHeight: 24, marginTop: 6 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF29', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  accountAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF80', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  accountText: { flex: 1 },
  accountName: { color: '#fff', fontFamily: A.fontBodyBold, fontSize: 18 },
  accountRole: { color: '#FFFFFFCC', fontFamily: A.fontBody, fontSize: 14 },
  searchBox: { height: 56, backgroundColor: '#fff', borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginTop: 16 },
  searchInput: { flex: 1, minWidth: 0, height: 56, color: A.text, fontFamily: A.fontBody, fontSize: 16, outlineStyle: 'none' } as any,
  sheet: { flex: 1, backgroundColor: A.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, minHeight: 500 },
  sheetDesktop: { borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40 },
  sheetContent: { gap: 22, paddingTop: 24, paddingBottom: 150 },
  chip: { height: 44, borderRadius: 22, paddingHorizontal: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: A.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: A.primary, borderColor: A.primary },
  chipText: { fontFamily: A.fontBodySemi, fontSize: 15, color: A.text },
  chipTextActive: { color: '#fff' },
  action: { height: 56, borderRadius: 28, backgroundColor: A.primary, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  actionCompact: { height: 44, borderRadius: 22 },
  actionSecondary: { backgroundColor: A.lilac }, actionDanger: { backgroundColor: '#FDE7EA' },
  actionText: { color: '#fff', fontFamily: A.fontBodySemi, fontSize: 16 },
  actionSecondaryText: { color: A.primary }, actionDangerText: { color: A.danger },
  disabled: { opacity: .45 },
  message: { backgroundColor: A.lilac, borderRadius: 16, padding: 14 },
  messageDanger: { backgroundColor: '#FDE7EA' },
  messageText: { color: A.primaryDeep, fontFamily: A.fontBody, fontSize: 14, lineHeight: 20 },
  messageDangerText: { color: A.danger },
});
