import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Screens
import { MarketScreen } from '../screens/MarketScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { TradeScreen } from '../screens/TradeScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Piyasa':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Portföy':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'İşlem':
              iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
              break;
            case 'Hesap':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Analiz':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Piyasa" component={MarketScreen} />
      <Tab.Screen name="Portföy" component={PortfolioScreen} />
      <Tab.Screen name="İşlem" component={TradeScreen} />
      <Tab.Screen name="Hesap" component={AccountScreen} />
      <Tab.Screen name="Analiz" component={AnalysisScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={{ title: 'Hisse Detay' }}
      />
    </Stack.Navigator>
  );
}
