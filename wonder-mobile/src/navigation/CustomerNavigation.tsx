import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotifications } from '../contexts/NotificationsContext';
import { customerTheme } from '../styles/customerTheme';

const C = customerTheme.v4;
const tabs = [
  { name: 'Home', label: 'Início', icon: 'home-outline' },
  { name: 'Search', label: 'Buscar', icon: 'search-outline' },
  { name: 'Appointments', label: 'Agenda', icon: 'calendar-outline' },
  { name: 'Notifications', label: 'Avisos', icon: 'notifications-outline' },
  { name: 'Profile', label: 'Perfil', icon: 'person-outline' },
] as const;

export function CustomerNavigation({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const desktop = width >= 900;
  return <View style={[desktop ? styles.sidebar : styles.pill,
    desktop ? { width: width >= 1280 ? 272 : 248, paddingTop: Math.max(insets.top, 28) } :
      { bottom: 18 + insets.bottom, width: width >= 640 ? 420 : Math.min(343, width - 32) }]}>
    {desktop ? <Text style={styles.brand}>Wonder</Text> : null}
    {tabs.map(tab => {
      const index = state.routes.findIndex(route => route.name === tab.name);
      const selected = state.index === index;
      return <Pressable key={tab.name} accessibilityRole="button" accessibilityLabel={tab.label}
        accessibilityState={{ selected }} onPress={() => {
          if (tab.name === 'Home') navigation.navigate('Home', { screen: 'HomeRoot' });
          else if (tab.name === 'Search') navigation.navigate('Search', { screen: 'SearchHome' });
          else navigation.navigate(tab.name);
        }}
        style={[styles.item, desktop && styles.itemDesktop, selected && styles.active]}>
        <View style={styles.iconWrap}>
          <Ionicons name={tab.icon} size={24} color={selected ? '#FFF' : C.textMuted} />
          {tab.name === 'Notifications' && unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}
        </View>
        {(selected || desktop) ? <Text style={[styles.label, selected && styles.activeLabel, desktop && styles.labelDesktop]}>{tab.label}</Text> : null}
      </Pressable>;
    })}
  </View>;
}
const shadow = { shadowColor: C.primaryDeep, shadowOffset: { width: 0, height: 10 }, shadowOpacity: .18, shadowRadius: 28, elevation: 8 } as const;
const styles = StyleSheet.create({
  pill: { position: 'absolute', alignSelf: 'center', height: 68, borderRadius: 36, backgroundColor: '#FFF', padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFF', paddingHorizontal: 16, gap: 6, borderRightWidth: 1, borderRightColor: C.border },
  brand: { fontFamily: C.fontDisplay, fontSize: 28, color: C.primary, paddingHorizontal: 16, paddingBottom: 28 },
  item: { height: 52, minWidth: 48, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  itemDesktop: { justifyContent: 'flex-start', height: 54, paddingHorizontal: 16, gap: 12 },
  active: { backgroundColor: C.primary, paddingHorizontal: 16 },
  iconWrap: { width: 24, height: 24 },
  label: { fontFamily: C.fontBodySemi, fontSize: 14, color: C.textMuted },
  labelDesktop: { fontSize: 16 },
  activeLabel: { color: '#FFF' },
  badge: { position: 'absolute', top: -8, left: 16, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 3, backgroundColor: C.danger, borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: C.fontBodyBold, fontSize: 11, color: '#FFF', lineHeight: 15 },
});

