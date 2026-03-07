import { Tabs, Redirect } from 'expo-router';
import { Bike, Wrench, Settings } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const user = useQuery(api.users.getCurrent);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Wait for user query to load
  if (user === undefined) {
    return null;
  }

  // Redirect to onboarding if user doesn't exist yet or hasn't completed it
  if (user === null || !user.hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface1,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 24,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 16,
          left: 20,
          right: 20,
          height: 64,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Garage',
          tabBarIcon: ({ size, color }) => (
            <Bike size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Maintenance',
          tabBarIcon: ({ size, color }) => (
            <Wrench size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
