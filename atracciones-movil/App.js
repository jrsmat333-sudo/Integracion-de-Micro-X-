import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { 
  PlusJakartaSans_400Regular, 
  PlusJakartaSans_500Medium, 
  PlusJakartaSans_600SemiBold 
} from '@expo-google-fonts/plus-jakarta-sans';
import { ApolloProvider } from '@apollo/client/react';

import { client } from './src/services/graphql';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

console.log('AppNavigator:', AppNavigator);
console.log('AuthProvider:', AuthProvider);
console.log('ApolloProvider:', ApolloProvider);
console.log('SafeAreaProvider:', SafeAreaProvider);
console.log('StatusBar:', StatusBar);

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="dark" />
        </AuthProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
