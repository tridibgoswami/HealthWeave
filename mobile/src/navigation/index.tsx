import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '../store/authStore';
import { LoginScreen }     from '../screens/auth/LoginScreen';
import { RegisterScreen }  from '../screens/auth/RegisterScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ChatScreen }      from '../screens/ChatScreen';
import { TimelineScreen }  from '../screens/TimelineScreen';
import { UploadScreen }    from '../screens/UploadScreen';
import { AlertsScreen }    from '../screens/AlertsScreen';
import { ProfileScreen }   from '../screens/ProfileScreen';
import { Colors, Typography } from '../theme';
import type { AuthStackParams, MainTabsParams } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const MainTabs  = createBottomTabNavigator<MainTabsParams>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: string; inactive: string }> = {
            Home:     { active: 'home',           inactive: 'home-outline' },
            Timeline: { active: 'time',           inactive: 'time-outline' },
            Upload:   { active: 'cloud-upload',   inactive: 'cloud-upload-outline' },
            Alerts:   { active: 'notifications',  inactive: 'notifications-outline' },
            Profile:  { active: 'person-circle',  inactive: 'person-circle-outline' },
            Chat:     { active: 'chatbubbles',    inactive: 'chatbubbles-outline' },
          };
          const icon = icons[route.name] || { active: 'ellipse', inactive: 'ellipse-outline' };
          return (
            <Ionicons
              name={(focused ? icon.active : icon.inactive) as any}
              size={focused ? 24 : 22} color={color}
            />
          );
        },
      })}
    >
      <MainTabs.Screen name="Home"     component={DashboardScreen} options={{ title: 'Home' }} />
      <MainTabs.Screen name="Timeline" component={TimelineScreen}  options={{ title: 'Timeline' }} />
      <MainTabs.Screen
        name="Upload" component={UploadScreen}
        options={{
          title: 'Upload',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.uploadTab, focused && styles.uploadTabActive]}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <MainTabs.Screen name="Alerts"  component={AlertsScreen}  options={{ title: 'Alerts' }} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </MainTabs.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => { loadUser(); }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>🧬</Text>
        <Text style={styles.splashText}>HealthWeave</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  splashLogo: { fontSize: 64, marginBottom: 8 },
  splashText: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  uploadTab: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4, elevation: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 8,
  },
  uploadTabActive: { backgroundColor: Colors.primaryDark },
});
