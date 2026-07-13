import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminProviderDetailsScreen } from '../screens/admin/AdminProviderDetailsScreen';
import { AdminProvidersScreen } from '../screens/admin/AdminProvidersScreen';

export type AdminProvidersStackParamList = {
  AdminProvidersList: undefined;
  AdminProviderDetails: { prestadorId: number };
};

const Stack = createNativeStackNavigator<AdminProvidersStackParamList>();

export function AdminProvidersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminProvidersList" component={AdminProvidersScreen} />
      <Stack.Screen name="AdminProviderDetails" component={AdminProviderDetailsScreen} />
    </Stack.Navigator>
  );
}
