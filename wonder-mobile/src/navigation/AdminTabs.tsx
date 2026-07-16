import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminIcon, AdminIconName } from '../components/admin/AdminIcon';
import { AdminAuditScreen } from '../screens/admin/AdminAuditScreen';
import { AdminCategoriesScreen } from '../screens/admin/AdminCategoriesScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminMonitoringScreen } from '../screens/admin/AdminMonitoringScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { theme } from '../styles/theme';
import { AdminProvidersStack } from './AdminProvidersStack';

export type AdminHomeStackParamList = {
  AdminHomeHub: undefined;
  AdminAudit: undefined;
};

export type AdminTabsParamList = {
  AdminHome: undefined;
  AdminProviders: undefined;
  AdminCategories: undefined;
  AdminMonitoring: undefined;
  AdminProfile: undefined;
};

const Tab = createBottomTabNavigator<AdminTabsParamList>();
const HomeStack = createNativeStackNavigator<AdminHomeStackParamList>();

const tabIcons: Record<keyof AdminTabsParamList, AdminIconName> = {
  AdminHome: 'home',
  AdminProviders: 'groups',
  AdminCategories: 'category',
  AdminMonitoring: 'monitor',
  AdminProfile: 'person',
};

const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: theme.colors.primary,
  tabBarInactiveTintColor: theme.colors.textMuted,
  tabBarLabelStyle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
  tabBarStyle: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    height: 64,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
} as const;

function AdminHomeStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="AdminHomeHub" component={AdminHomeScreen} />
      <HomeStack.Screen name="AdminAudit" component={AdminAuditScreen} />
    </HomeStack.Navigator>
  );
}

function TabIcon({ name, color, size }: { name: keyof AdminTabsParamList; color: string; size: number }) {
  return <AdminIcon name={tabIcons[name]} color={color} size={size} />;
}

export function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="AdminHome" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminProviders"
        component={AdminProvidersStack}
        options={{
          title: 'Prestadores',
          tabBarIcon: ({ color, size }) => <TabIcon name="AdminProviders" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminCategories"
        component={AdminCategoriesScreen}
        options={{
          title: 'Categorias',
          tabBarIcon: ({ color, size }) => <TabIcon name="AdminCategories" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminMonitoring"
        component={AdminMonitoringScreen}
        options={{
          title: 'Observ.',
          tabBarIcon: ({ color, size }) => <TabIcon name="AdminMonitoring" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <TabIcon name="AdminProfile" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
