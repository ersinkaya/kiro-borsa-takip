import React, { useState } from 'react';
import { TouchableOpacity, Modal, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { APP_VERSION } from '../constants/version';

// Screens
import { WatchlistScreen } from '../screens/WatchlistScreen';
import { MarketScreen } from '../screens/MarketScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { IndicatorsScreen } from '../screens/IndicatorsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const [profileVisible, setProfileVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home';

            switch (route.name) {
              case 'Takip':
                iconName = focused ? 'eye' : 'eye-outline';
                break;
              case 'Piyasa':
                iconName = focused ? 'trending-up' : 'trending-up-outline';
                break;
              case 'Portföy':
                iconName = focused ? 'briefcase' : 'briefcase-outline';
                break;
              case 'İşlemler':
                iconName = focused ? 'receipt' : 'receipt-outline';
                break;
              case 'Analiz':
                iconName = focused ? 'analytics' : 'analytics-outline';
                break;
              case 'İndikatörler':
                iconName = focused ? 'pulse' : 'pulse-outline';
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
            fontSize: 16,
          },
          headerLeft: () => {
            const { Text } = require('react-native');
            return <Text style={{ color: COLORS.textMuted, fontSize: 10, marginLeft: 12 }}>v{APP_VERSION}</Text>;
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setProfileVisible(true)}
              style={{ marginRight: 12, padding: 4 }}
            >
              <Ionicons name="person-circle-outline" size={26} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ),
        })}
      >
        <Tab.Screen name="Takip" component={WatchlistScreen} />
        <Tab.Screen name="Piyasa" component={MarketScreen} />
        <Tab.Screen name="Portföy" component={PortfolioScreen} />
        <Tab.Screen name="İşlemler" component={AccountScreen} />
        <Tab.Screen name="Analiz" component={AnalysisScreen} />
        <Tab.Screen name="İndikatörler" component={IndicatorsScreen} />
      </Tab.Navigator>

      {/* Profil Modal */}
      <Modal
        visible={profileVisible}
        animationType="slide"
        onRequestClose={() => setProfileVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <View />
            <TouchableOpacity onPress={() => setProfileVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ProfileScreen />
        </View>
      </Modal>
    </>
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
