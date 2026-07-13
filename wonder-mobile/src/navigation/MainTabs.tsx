import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { NotificationsProvider, useNotifications } from '../contexts/NotificationsContext';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProviderAgendaScreen } from '../screens/ProviderAgendaScreen';
import { ProviderProfileScreen } from '../screens/ProviderProfileScreen';
import { theme } from '../styles/theme';
import { AdminTabs } from './AdminTabs';
import { SearchStack } from './SearchStack';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
  Appointments: undefined;
  Notifications: undefined;
  Chat: undefined;
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

const clientTabIcons: Record<keyof MainTabsParamList, string> = {
  Home: 'H',
  Search: 'B',
  Appointments: 'A',
  Notifications: 'N',
  Chat: 'C',
  Profile: 'P',
};

const providerTabIcons: Record<keyof ProviderTabsParamList, string> = {
  ProviderAgenda: 'A',
  Notifications: 'N',
  Chat: 'C',
  ProviderProfile: 'P',
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

function MainTabsInner() {
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
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
                {providerTabIcons.ProviderAgenda}
              </Text>
            ),
          }}
        />
        <ProviderTab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: 'Avisos',
            tabBarBadge: notificationsBadge,
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
                {providerTabIcons.Notifications}
              </Text>
            ),
          }}
        />
        <ProviderTab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'Assistente',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
                {providerTabIcons.Chat}
              </Text>
            ),
          }}
        />
        <ProviderTab.Screen
          name="ProviderProfile"
          component={ProviderProfileScreen}
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
                {providerTabIcons.ProviderProfile}
              </Text>
            ),
          }}
        />
      </ProviderTab.Navigator>
    );
  }

  return (
    <ClientTab.Navigator screenOptions={sharedScreenOptions}>
      <ClientTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
              {clientTabIcons.Home}
            </Text>
          ),
        }}
      />
      <ClientTab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
              {clientTabIcons.Search}
            </Text>
          ),
        }}
      />
      <ClientTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
              {clientTabIcons.Appointments}
            </Text>
          ),
        }}
      />
      <ClientTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Avisos',
          tabBarBadge: notificationsBadge,
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
              {clientTabIcons.Notifications}
            </Text>
          ),
        }}
      />
      <ClientTab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
              {clientTabIcons.Chat}
            </Text>
          ),
        }}
      />
      <ClientTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size, fontWeight: theme.fontWeight.bold }}>
              {clientTabIcons.Profile}
            </Text>
          ),
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
