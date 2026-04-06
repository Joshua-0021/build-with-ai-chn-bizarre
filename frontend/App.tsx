/**
 * PachApp — Main Application with Navigation
 *
 * Routes based on user role:
 * - User (Household): Dashboard → Redeem
 * - Green Army (Collector): Dashboard → Scanner
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Colors } from './constants/theme';

// Screens
import LoginScreen from './screens/auth/LoginScreen';
import UserDashboard from './screens/user/UserDashboard';
import RedeemScreen from './screens/user/RedeemScreen';
import GreenArmyDashboard from './screens/greenarmy/GreenArmyDashboard';
import ScannerScreen from './screens/greenarmy/ScannerScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: Colors.surface,
  },
  headerTintColor: Colors.text,
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
  headerShadowVisible: false,
  contentStyle: {
    backgroundColor: Colors.background,
  },
};

function UserStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={UserDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Redeem"
        component={RedeemScreen}
        options={{ title: 'Redeem Points' }}
      />
    </Stack.Navigator>
  );
}

function GreenArmyStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={GreenArmyDashboard}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: 'Scan QR Code' }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      ) : user?.role === 'greenarmy' ? (
        <GreenArmyStack />
      ) : (
        <UserStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
