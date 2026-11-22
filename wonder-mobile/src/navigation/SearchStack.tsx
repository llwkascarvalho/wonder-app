import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AgendamentoScreen } from '../screens/AgendamentoScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PrestadorProfileScreen } from '../screens/PrestadorProfileScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { theme } from '../styles/theme';

export type SearchStackParamList = {
  HomeRoot: undefined;
  SearchHome: undefined;
  PrestadorProfile: { prestadorId: number };
  Agendamento: { prestadorId: number };
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

function CatalogStack({ root }: { root: 'HomeRoot' | 'SearchHome' }) {
  return (
    <Stack.Navigator
      initialRouteName={root}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: theme.fontWeight.semibold as '600' },
      }}
    >
      {root === 'HomeRoot'
        ? <Stack.Screen name="HomeRoot" component={HomeScreen} options={{ title: 'Início' }} />
        : <Stack.Screen name="SearchHome" component={SearchScreen} options={{ title: 'Buscar' }} />}
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

export function HomeStack() {
  return <CatalogStack root="HomeRoot" />;
}

export function SearchStack() {
  return <CatalogStack root="SearchHome" />;
}
