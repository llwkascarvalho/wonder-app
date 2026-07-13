import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AgendamentoScreen } from '../screens/AgendamentoScreen';
import { PrestadorProfileScreen } from '../screens/PrestadorProfileScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { theme } from '../styles/theme';

export type SearchStackParamList = {
  SearchHome: undefined;
  PrestadorProfile: { prestadorId: number };
  Agendamento: { prestadorId: number };
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: theme.fontWeight.semibold as '600' },
      }}
    >
      <Stack.Screen name="SearchHome" component={SearchScreen} options={{ title: 'Buscar' }} />
      <Stack.Screen
        name="PrestadorProfile"
        component={PrestadorProfileScreen}
        options={{ title: 'Prestador' }}
      />
      <Stack.Screen
        name="Agendamento"
        component={AgendamentoScreen}
        options={{ title: 'Agendar horário' }}
      />
    </Stack.Navigator>
  );
}
