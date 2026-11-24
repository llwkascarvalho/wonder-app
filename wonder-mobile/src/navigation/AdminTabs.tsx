import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminCategoriesScreen } from '../screens/admin/AdminCategoriesScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminProvidersDirectoryScreen } from '../screens/admin/AdminProvidersDirectoryScreen';
import { AdminProviderDetailsScreen } from '../screens/admin/AdminProviderDetailsScreen';
import { AdminReportScreen } from '../screens/admin/AdminReportScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { customerTheme } from '../styles/customerTheme';
import { AdminProvidersStack } from './AdminProvidersStack';

export type AdminHomeStackParamList = {
  AdminHomeHub: undefined;
  AdminUsers: undefined;
  AdminProvidersDirectory: { pending?: boolean };
  AdminProviderDetails: { prestadorId: number; initialAction?: 'rejeitado' };
  AdminReport: undefined;
};

export type AdminTabsParamList = {
  AdminHome: NavigatorScreenParams<AdminHomeStackParamList> | undefined;
  AdminProviders: undefined;
  AdminCategories: undefined;
};

const Tab = createBottomTabNavigator<AdminTabsParamList>();
const HomeStack = createNativeStackNavigator<AdminHomeStackParamList>();
const C = customerTheme.v4;

function AdminHomeStack() {
  return <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="AdminHomeHub" component={AdminHomeScreen} />
    <HomeStack.Screen name="AdminUsers" component={AdminUsersScreen} />
    <HomeStack.Screen name="AdminProvidersDirectory" component={AdminProvidersDirectoryScreen} />
    <HomeStack.Screen name="AdminProviderDetails" component={AdminProviderDetailsScreen} />
    <HomeStack.Screen name="AdminReport" component={AdminReportScreen} />
  </HomeStack.Navigator>;
}

const tabs = [
  { name: 'AdminHome', label: 'Visão geral', icon: 'home-outline' },
  { name: 'AdminProviders', label: 'Solicitações', icon: 'document-text-outline' },
  { name: 'AdminCategories', label: 'Categorias', icon: 'pricetag-outline' },
] as const;

function AdminNavigation({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 900;
  const nested = state.routes[state.index]?.state;
  const activeChild = nested?.routes[nested.index ?? 0]?.name;
  if (!desktop && activeChild === 'AdminProviderDetails') return null;
  return <View style={[desktop ? styles.sidebar : styles.pill,
    desktop ? { width: width >= 1280 ? 272 : 248, paddingTop: Math.max(insets.top, 28) } :
      { bottom: 18 + insets.bottom, width: width >= 640 ? 420 : Math.min(343, width - 32) }]}>
    {desktop ? <Text style={styles.brand}>Wonder</Text> : null}
    {tabs.map(tab => {
      const selected = state.routes[state.index]?.name === tab.name;
      return <Pressable key={tab.name} accessibilityRole="button" accessibilityLabel={tab.label}
        accessibilityState={{ selected }} onPress={() => {
          if (tab.name === 'AdminHome') navigation.navigate('AdminHome', { screen: 'AdminHomeHub' });
          else navigation.navigate(tab.name);
        }}
        style={[styles.item, desktop && styles.itemDesktop, selected && styles.active]}>
        <Ionicons name={tab.icon} size={24} color={selected ? '#fff' : C.textMuted} />
        {(selected || desktop) ? <Text style={[styles.label, selected && styles.activeLabel]}>{tab.label}</Text> : null}
      </Pressable>;
    })}
  </View>;
}

export function AdminTabs() {
  return <Tab.Navigator screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }} tabBar={(props) => <AdminNavigation {...props} />}>
    <Tab.Screen name="AdminHome" component={AdminHomeStack} />
    <Tab.Screen name="AdminProviders" component={AdminProvidersStack} />
    <Tab.Screen name="AdminCategories" component={AdminCategoriesScreen} />
  </Tab.Navigator>;
}

const shadow = { shadowColor: C.primaryDeep, shadowOffset: { width: 0, height: 10 }, shadowOpacity: .18, shadowRadius: 28, elevation: 8 } as const;
const styles = StyleSheet.create({
  pill: { position: 'absolute', alignSelf: 'center', height: 68, borderRadius: 36, backgroundColor: '#fff', padding: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 16,
    gap: 6, borderRightWidth: 1, borderRightColor: C.border },
  brand: { fontFamily: C.fontDisplay, fontSize: 28, color: C.primary, paddingHorizontal: 16, paddingBottom: 28 },
  item: { height: 52, minWidth: 48, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  itemDesktop: { justifyContent: 'flex-start', height: 54, paddingHorizontal: 16, gap: 12 },
  active: { backgroundColor: C.primary, paddingHorizontal: 16 },
  label: { fontFamily: C.fontBodySemi, fontSize: 14, color: C.textMuted },
  activeLabel: { color: '#fff' },
});
