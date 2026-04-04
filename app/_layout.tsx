import { useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from './providers/AuthProvider';
import { AnimatedSplash } from '@/components/AnimatedSplash';

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
  const [splashDone, setSplashDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
        {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
