import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { NotificationsProvider, useNotifications } from '../contexts/NotificationsContext';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProviderAgendaScreen } from '../screens/ProviderAgendaScreen';
import { ProviderProfileScreen } from '../screens/ProviderProfileScreen';
import { theme } from '../styles/theme';
import { AdminTabs } from './AdminTabs';
import { ProfileStack } from './ProfileStack';
import { SearchStack } from './SearchStack';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
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

const clientTabIcons: Record<keyof MainTabsParamList, TabIconName> = {
  Home: 'home',
  Search: 'search',
  Appointments: 'event',
  Notifications: 'notifications',
  Profile: 'person',
};

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

const customerScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: theme.colors.white,
  tabBarInactiveTintColor: theme.colors.white,
  tabBarShowLabel: false,
  tabBarStyle: {
    backgroundColor: '#7324E3',
    borderRadius: 32,
    borderTopWidth: 0,
    bottom: 16,
    elevation: 8,
    height: 60,
    left: '50%',
    paddingHorizontal: 12,
    position: 'absolute',
    shadowColor: '#24102E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    transform: [{ translateX: -167.5 }],
    width: 335,
  },
  tabBarItemStyle: { height: 60 },
} as const;

function TabIcon({ name, color, size }: { name: TabIconName; color: string; size: number }) {
  return <MaterialIcons name={name} color={color} size={size} />;
}

function CustomerTabIcon({ name, focused }: { name: TabIconName; focused: boolean }) {
  return (
    <View style={{
      alignItems: 'center', backgroundColor: focused ? '#481793' : 'transparent', borderRadius: 999,
      height: 44, justifyContent: 'center', width: 44,
    }}>
      <MaterialIcons name={name} color={theme.colors.white} size={22} />
    </View>
  );
}

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
    <ClientTab.Navigator screenOptions={customerScreenOptions}>
      <ClientTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <CustomerTabIcon name={clientTabIcons.Home} focused={focused} />,
        }}
      />
      <ClientTab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: 'Buscar',
          tabBarIcon: ({ focused }) => <CustomerTabIcon name={clientTabIcons.Search} focused={focused} />,
        }}
      />
      <ClientTab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) => <CustomerTabIcon name={clientTabIcons.Appointments} focused={focused} />,
        }}
      />
      <ClientTab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Avisos',
          tabBarBadge: notificationsBadge,
          tabBarIcon: ({ focused }) => <CustomerTabIcon name={clientTabIcons.Notifications} focused={focused} />,
        }}
      />
      <ClientTab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <CustomerTabIcon name={clientTabIcons.Profile} focused={focused} />,
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
