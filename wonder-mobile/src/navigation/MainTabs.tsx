import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProviderAgendaScreen } from '../screens/ProviderAgendaScreen';
import { ProviderProfileScreen } from '../screens/ProviderProfileScreen';
import { theme } from '../styles/theme';
import { SearchStack } from './SearchStack';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
  Appointments: undefined;
  Profile: undefined;
};

type ProviderTabsParamList = {
  ProviderAgenda: undefined;
  ProviderProfile: undefined;
};

const ClientTab = createBottomTabNavigator<MainTabsParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabsParamList>();

const clientTabIcons: Record<keyof MainTabsParamList, string> = {
  Home: 'H',
  Search: 'B',
  Appointments: 'A',
  Profile: 'P',
};

const providerTabIcons: Record<keyof ProviderTabsParamList, string> = {
  ProviderAgenda: 'A',
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

export function MainTabs() {
  const { usuario } = useAuth();
  const tipoUsuario = usuario?.tipo_usuario?.toLowerCase();
  const useProviderFlow = tipoUsuario === 'prestador';

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
