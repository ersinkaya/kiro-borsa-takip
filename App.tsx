import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthScreen } from './src/screens/AuthScreen';
import { useAuthStore } from './src/store/useAuthStore';
import { usePortfolioStore } from './src/store/usePortfolioStore';
import { useWatchlistStore } from './src/store/useWatchlistStore';
import { COLORS } from './src/constants/theme';

export default function App() {
  const { user, initialized, initialize } = useAuthStore();
  const loadData = usePortfolioStore((state) => state.loadData);
  const loadWatchlist = useWatchlistStore((state) => state.loadWatchlist);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      loadWatchlist();
    }
  }, [user]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {user ? (
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}
