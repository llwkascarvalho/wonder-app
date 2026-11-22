import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { NotificationsProvider, useNotifications } from '../contexts/NotificationsContext';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProviderAgendaScreen } from '../screens/ProviderAgendaScreen';
import { ProviderProfileScreen } from '../screens/ProviderProfileScreen';
import { theme } from '../styles/theme';
import { AdminTabs } from './AdminTabs';
import { ProfileStack } from './ProfileStack';
import { CustomerNavigation } from './CustomerNavigation';
import { HomeStack, SearchStack } from './SearchStack';
import type { SearchStackParamList } from './SearchStack';

export type MainTabsParamList = {
  Home: NavigatorScreenParams<SearchStackParamList> | undefined;
  Search: NavigatorScreenParams<SearchStackParamList> | undefined;
  Appointments: undefined;
  Notifications: undefined;
  Profile: undefined;
};

type ProviderTabsParamList = {
  ProviderAgenda: undefined;
  Notifications: undefined;
  Chat: undefined;
  ProviderProfile: undefined;
};

const ClientTab = createBottomTabNavigator<MainTabsParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabsParamList>();

type TabIconName = ComponentProps<typeof MaterialIcons>['name'];

const providerTabIcons: Record<keyof ProviderTabsParamList, TabIconName> = {
  ProviderAgenda: 'event',
  Notifications: 'notifications',
  Chat: 'chat',
  ProviderProfile: 'store',
};

const sharedScreenOptions = {
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

function TabIcon({ name, color, size }: { name: TabIconName; color: string; size: number }) {
  return <MaterialIcons name={name} color={color} size={size} />;
}

function MainTabsInner() {
  const { width } = useWindowDimensions();
  const { usuario } = useAuth();
  const { unreadCount } = useNotifications();
  const tipoUsuario = usuario?.tipo_usuario?.toLowerCase();
  const useAdminFlow = tipoUsuario === 'admin';
  const useProviderFlow = tipoUsuario === 'prestador';

  const notificationsBadge = unreadCount > 0 ? unreadCount : undefined;

  if (useAdminFlow) {
    return <AdminTabs />;
  }

  if (useProviderFlow) {
    return (
      <ProviderTab.Navigator screenOptions={sharedScreenOptions}>
        <ProviderTab.Screen
          name="ProviderAgenda"
          component={ProviderAgendaScreen}
          options={{
            title: 'Agendamentos',
            tabBarIcon: ({ color, size }) => <TabIcon name={providerTabIcons.ProviderAgenda} color={color} size={size} />,
          }}
        />
        <ProviderTab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: 'Avisos',
            tabBarBadge: notificationsBadge,
            tabBarIcon: ({ color, size }) => <TabIcon name={providerTabIcons.Notifications} color={color} size={size} />,
          }}
        />
        <ProviderTab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'Assistente',
            tabBarIcon: ({ color, size }) => <TabIcon name={providerTabIcons.Chat} color={color} size={size} />,
          }}
        />
        <ProviderTab.Screen
          name="ProviderProfile"
          component={ProviderProfileScreen}
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => <TabIcon name={providerTabIcons.ProviderProfile} color={color} size={size} />,
          }}
        />
      </ProviderTab.Navigator>
    );
  }

  return (
    <ClientTab.Navigator tabBar={(props) => <CustomerNavigation {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { marginLeft: width >= 900 ? (width >= 1280 ? 272 : 248) : 0 } }}>
      <ClientTab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: 'Inicio',
        }}
      />
      <ClientTab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: 'Buscar',
        }}
      />
      <ClientTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: 'Agenda',
        }}
      />
      <ClientTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Avisos',
        }}
      />
      <ClientTab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Perfil',
        }}
      />
    </ClientTab.Navigator>
  );
}

export function MainTabs() {
  return (
    <NotificationsProvider>
      <MainTabsInner />
    </NotificationsProvider>
  );
}
