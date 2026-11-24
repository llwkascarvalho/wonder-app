import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';
import { AppointmentsScreen } from '../screens/AppointmentsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProviderAgendaScreen } from '../screens/ProviderAgendaScreen';
import { ProviderProfileScreen } from '../screens/ProviderProfileScreen';
import { AdminTabs } from './AdminTabs';
import { ProfileStack } from './ProfileStack';
import { CustomerNavigation, ProviderNavigation } from './CustomerNavigation';
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
  ProviderProfile: undefined;
};

const ClientTab = createBottomTabNavigator<MainTabsParamList>();
const ProviderTab = createBottomTabNavigator<ProviderTabsParamList>();

function MainTabsInner() {
  const { width } = useWindowDimensions();
  const { usuario } = useAuth();
  const tipoUsuario = usuario?.tipo_usuario?.toLowerCase();
  const useAdminFlow = tipoUsuario === 'admin';
  const useProviderFlow = tipoUsuario === 'prestador';

  if (useAdminFlow) {
    return <AdminTabs />;
  }

  if (useProviderFlow) {
    return (
      <ProviderTab.Navigator tabBar={(props) => <ProviderNavigation {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { marginLeft: width >= 900 ? (width >= 1280 ? 272 : 248) : 0 } }}>
        <ProviderTab.Screen
          name="ProviderAgenda"
          component={ProviderAgendaScreen}
          options={{ title: 'Agenda' }}
        />
        <ProviderTab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Avisos' }}
        />
        <ProviderTab.Screen
          name="ProviderProfile"
          component={ProviderProfileScreen}
          options={{ title: 'Perfil' }}
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
