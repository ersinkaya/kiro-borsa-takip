import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePortfolioStore } from './src/store/usePortfolioStore';
import { useWatchlistStore } from './src/store/useWatchlistStore';

export default function App() {
  const loadData = usePortfolioStore((state) => state.loadData);
  const loadWatchlist = useWatchlistStore((state) => state.loadWatchlist);

  useEffect(() => {
    loadData();
    loadWatchlist();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
