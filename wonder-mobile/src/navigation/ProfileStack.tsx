import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileScreen } from '../screens/ProfileScreen';
import { ProviderOnboardingScreen } from '../screens/ProviderOnboardingScreen';

export type ProfileStackParamList = {
  ClientProfile: undefined;
  ProviderOnboarding: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientProfile" component={ProfileScreen} />
      <Stack.Screen
        name="ProviderOnboarding"
        component={ProviderOnboardingScreen}
      />
    </Stack.Navigator>
  );
}
