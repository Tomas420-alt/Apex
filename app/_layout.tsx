import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from './providers/AuthProvider';

// Polyfill window.addEventListener/removeEventListener for React Native
// Convex WebSocket manager expects these to exist
if (Platform.OS !== 'web') {
  if (typeof window !== 'undefined' && !window.addEventListener) {
    window.addEventListener = () => {};
    window.removeEventListener = () => {};
  }
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
