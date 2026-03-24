import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const savePushToken = useMutation(api.users.savePushToken);
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (hasRegistered.current) return;
    hasRegistered.current = true;

    registerForPushNotifications();
  }, []);

  async function registerForPushNotifications() {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Not a physical device — skipping registration');
      return;
    }

    // Only iOS and Android
    if (Platform.OS === 'web') return;

    try {
      // Check existing permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[Push] Permission not granted');
        return;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '45c894ed-f062-4291-8541-b360870c8b79',
      });

      const token = tokenData.data;
      if (__DEV__) console.log('[Push] Token:', token);

      // Save token to Convex user record
      await savePushToken({ token });
    } catch (error) {
      if (__DEV__) console.error('[Push] Registration error:', error);
    }
  }
}
