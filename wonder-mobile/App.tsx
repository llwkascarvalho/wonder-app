import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/styles/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Gruppo: require('./assets/fonts/Gruppo-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}