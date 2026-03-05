# Expo Notifications

## Overview

`expo-notifications` provides a unified API for local and push notifications on iOS and Android. It handles scheduling local notifications (e.g., maintenance reminders), requesting permissions, managing badges, receiving push notifications via the Expo Push Service, defining interactive notification categories/actions, and processing notifications in the background.

## Installation

```bash
npx expo install expo-notifications expo-device expo-constants
```

- **expo-notifications** — core notification APIs
- **expo-device** — detect physical device (required for push tokens)
- **expo-constants** — access project configuration (projectId)

For background notification handling, also install:

```bash
npx expo install expo-task-manager
```

## Configuration

### App Config Plugin

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default",
          "sounds": ["./assets/sounds/reminder.wav"],
          "enableBackgroundRemoteNotifications": false
        }
      ]
    ]
  }
}
```

| Property | Platform | Description |
|----------|----------|-------------|
| `icon` | Android | 96x96 all-white PNG for notification icon |
| `color` | Android | Tint color for the icon (default `#ffffff`) |
| `defaultChannel` | Android | Default FCMv1 notification channel ID |
| `sounds` | Both | Array of custom sound file paths (.wav) |
| `enableBackgroundRemoteNotifications` | iOS | Enable `remote-notification` background mode |

### Environment Variables

No environment variables are required for local notifications. For push notifications:

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_PROJECT_ID` | (Optional) EAS project ID if not using `app.json` config |

Push notification credentials (FCM for Android, APNs for iOS) are managed through EAS Build — not environment variables.

### Android FCM Setup

1. Create a Firebase project and add your Android app
2. Download `google-services.json` and place it in your project root
3. Run `eas credentials` or configure via EAS Dashboard to upload FCM V1 server key

### iOS APNs Setup

Handled automatically by EAS Build. For manual builds, configure APNs keys/certificates through Apple Developer Portal and upload via `eas credentials`.

## Initialization

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// MUST be called at module scope before any notification arrives
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

> **Important:** `setNotificationHandler` must be called at the top level of your app (e.g., in `app/_layout.tsx`). The handler callback must resolve within **3 seconds** on iOS or the notification is discarded.

## Key Patterns

### 1. Requesting Permissions

```typescript
async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  // Android 8.0+ requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
}
```

### 2. Scheduling a Local Notification (One-Time)

```typescript
// Fire once after a delay
const id = await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Maintenance Reminder',
    body: 'Time to check your equipment!',
    sound: 'reminder.wav', // filename only, must be in plugin sounds array
    data: { screen: 'maintenance', itemId: '123' },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 60 * 60, // 1 hour from now
  },
});

// Fire at a specific date
const id2 = await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Scheduled Check',
    body: 'Your weekly inspection is due.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: new Date('2026-03-15T09:00:00'),
  },
});
```

### 3. Scheduling Recurring Notifications

```typescript
// Daily at 9:00 AM
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Daily Reminder',
    body: 'Check your maintenance tasks for today.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: 9,
    minute: 0,
  },
});

// Weekly on Monday at 8:30 AM (1=Sunday, 2=Monday, ..., 7=Saturday)
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Weekly Review',
    body: 'Time for your weekly maintenance review.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: 2, // Monday
    hour: 8,
    minute: 30,
  },
});

// Monthly on the 1st at 10:00 AM
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Monthly Inspection',
    body: 'Monthly equipment inspection is due.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
    day: 1,
    hour: 10,
    minute: 0,
  },
});
```

### 4. Managing Scheduled Notifications

```typescript
// List all scheduled notifications
const scheduled = await Notifications.getAllScheduledNotificationsAsync();

// Cancel a specific notification by ID
await Notifications.cancelScheduledNotificationAsync(notificationId);

// Cancel all scheduled notifications
await Notifications.cancelAllScheduledNotificationsAsync();

// Check when a trigger will next fire
const nextDate = await Notifications.getNextTriggerDateAsync({
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour: 9,
  minute: 0,
});
```

### 5. Listening for Notifications

```typescript
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

function useNotificationListeners() {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Fires when a notification is received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data;
        console.log('Notification received:', data);
      });

    // Fires when user taps on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        // Navigate to relevant screen based on data
        console.log('User tapped notification:', data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

### 6. Getting the Expo Push Token (for Push Notifications)

```typescript
async function registerForPushNotifications(): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new Error('EAS Project ID not found in app config');
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data; // "ExponentPushToken[xxxx]"
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}
```

### 7. Notification Categories & Interactive Actions

```typescript
// Define a category with actions
await Notifications.setNotificationCategoryAsync('MAINTENANCE_REMINDER', [
  {
    identifier: 'MARK_DONE',
    buttonTitle: 'Mark Done',
    options: {
      opensAppToForeground: false,
    },
  },
  {
    identifier: 'SNOOZE',
    buttonTitle: 'Snooze 1hr',
    options: {
      opensAppToForeground: false,
    },
  },
  {
    identifier: 'VIEW',
    buttonTitle: 'View Details',
    options: {
      opensAppToForeground: true,
    },
  },
]);

// Schedule notification with category
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Maintenance Due',
    body: 'Oil change is overdue by 3 days.',
    categoryIdentifier: 'MAINTENANCE_REMINDER',
    data: { taskId: 'oil-change-123' },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 5,
  },
});

// Handle action responses
Notifications.addNotificationResponseReceivedListener((response) => {
  const actionId = response.actionIdentifier;
  const data = response.notification.request.content.data;

  switch (actionId) {
    case 'MARK_DONE':
      // Mark the maintenance task as complete
      break;
    case 'SNOOZE':
      // Reschedule notification for 1 hour later
      break;
    case 'VIEW':
      // Navigate to task detail screen
      break;
    case Notifications.DEFAULT_ACTION_IDENTIFIER:
      // User tapped the notification itself (not a button)
      break;
  }
});
```

### 8. Badge Management

```typescript
// Set badge count
await Notifications.setBadgeCountAsync(5);

// Get current badge count
const count = await Notifications.getBadgeCountAsync();

// Clear badge
await Notifications.setBadgeCountAsync(0);
```

### 9. Android Notification Channels

```typescript
// Create channels for different notification types
await Notifications.setNotificationChannelAsync('reminders', {
  name: 'Reminders',
  description: 'Scheduled maintenance reminders',
  importance: Notifications.AndroidImportance.HIGH,
  sound: 'reminder.wav',
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#10B981',
});

await Notifications.setNotificationChannelAsync('alerts', {
  name: 'Urgent Alerts',
  description: 'Critical maintenance alerts',
  importance: Notifications.AndroidImportance.MAX,
  sound: 'default',
});

// Schedule to a specific channel
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Reminder',
    body: 'Check filters today.',
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: 9,
    minute: 0,
    channelId: 'reminders', // Android only
  },
});
```

### 10. Background Notification Handling

```typescript
// In app entry file (index.ts or app/_layout.tsx) — must be at module scope
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background notification error:', error);
    return;
  }
  // Process notification data (e.g., sync data, update local storage)
  console.log('Background notification received:', data);
});

// Register the task (call once, e.g., on app startup)
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
```

## API Reference

### Scheduling

| Method | Description |
|--------|-------------|
| `scheduleNotificationAsync(request)` | Schedule a local notification; returns notification ID |
| `cancelScheduledNotificationAsync(id)` | Cancel a specific scheduled notification |
| `cancelAllScheduledNotificationsAsync()` | Cancel all scheduled notifications |
| `getAllScheduledNotificationsAsync()` | List all pending scheduled notifications |
| `getNextTriggerDateAsync(trigger)` | Get the next fire date for a trigger config |

### Permissions

| Method | Description |
|--------|-------------|
| `getPermissionsAsync()` | Check current notification permission status |
| `requestPermissionsAsync(options?)` | Request notification permissions from the user |

### Push Tokens

| Method | Description |
|--------|-------------|
| `getExpoPushTokenAsync(options)` | Get Expo push token (requires physical device) |
| `getDevicePushTokenAsync()` | Get native FCM/APNs device token |
| `addPushTokenListener(listener)` | Listen for push token changes |

### Event Listeners

| Method | Description |
|--------|-------------|
| `addNotificationReceivedListener(cb)` | Fires when notification received in foreground |
| `addNotificationResponseReceivedListener(cb)` | Fires when user interacts with notification |
| `addNotificationsDroppedListener(cb)` | Fires when notifications are dropped by the OS |
| `useLastNotificationResponse()` | React hook for last notification response |

### Notification Display

| Method | Description |
|--------|-------------|
| `setNotificationHandler(handler)` | Configure foreground notification display behavior |
| `getPresentedNotificationsAsync()` | Get currently displayed notifications |
| `dismissNotificationAsync(id)` | Dismiss a specific notification from tray |
| `dismissAllNotificationsAsync()` | Dismiss all notifications from tray |

### Badge

| Method | Description |
|--------|-------------|
| `getBadgeCountAsync()` | Get current app badge count |
| `setBadgeCountAsync(count)` | Set app badge count |

### Categories & Actions

| Method | Description |
|--------|-------------|
| `setNotificationCategoryAsync(id, actions, options?)` | Define interactive notification category |
| `getNotificationCategoriesAsync()` | List all registered categories |
| `deleteNotificationCategoryAsync(id)` | Remove a notification category |

### Channels (Android)

| Method | Description |
|--------|-------------|
| `setNotificationChannelAsync(id, config)` | Create or update a notification channel |
| `getNotificationChannelsAsync()` | List all channels |
| `getNotificationChannelAsync(id)` | Get a specific channel |
| `deleteNotificationChannelAsync(id)` | Delete a channel |
| `setNotificationChannelGroupAsync(id, config)` | Create a channel group |
| `getNotificationChannelGroupsAsync()` | List all channel groups |
| `deleteNotificationChannelGroupAsync(id)` | Delete a channel group |

### Background Tasks

| Method | Description |
|--------|-------------|
| `registerTaskAsync(taskName)` | Register a background notification task |
| `unregisterTaskAsync(taskName)` | Unregister a background notification task |

### Trigger Types (`SchedulableTriggerInputTypes`)

| Type | Description | Key Fields |
|------|-------------|------------|
| `TIME_INTERVAL` | Fire after N seconds | `seconds`, `repeats?` |
| `DATE` | Fire at specific date | `date` (Date object or timestamp) |
| `DAILY` | Repeat daily | `hour`, `minute` |
| `WEEKLY` | Repeat weekly | `weekday` (1=Sun..7=Sat), `hour`, `minute` |
| `MONTHLY` | Repeat monthly | `day`, `hour`, `minute` |
| `YEARLY` | Repeat yearly | `month`, `day`, `hour`, `minute` |
| `CALENDAR` | iOS only, match date components | `dateComponents`, `repeats?` |

## Expo Push Service (Server-Side)

### Sending Push Notifications

```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json
```

```json
[
  {
    "to": "ExponentPushToken[xxxxxx]",
    "title": "Maintenance Alert",
    "body": "Your filter needs replacement.",
    "data": { "taskId": "filter-123" },
    "sound": "default",
    "badge": 1,
    "priority": "high",
    "ttl": 86400
  }
]
```

### Checking Receipts

```
POST https://exp.host/--/api/v2/push/getReceipts
Content-Type: application/json

{ "ids": ["ticket-id-1", "ticket-id-2"] }
```

Check receipts **15 minutes after sending**. Receipts expire after **24 hours**.

## Gotchas

1. **Physical device required** — Push tokens cannot be obtained on emulators/simulators. Local notifications work on emulators but behavior may differ.

2. **iOS 3-second handler timeout** — `setNotificationHandler` callback must resolve within 3 seconds or the notification is silently dropped.

3. **iOS repeating interval minimum** — When using `TIME_INTERVAL` with `repeats: true` on iOS, the interval must be **>= 60 seconds** or it will error.

4. **Android channel required (8.0+)** — You must create at least one notification channel before notifications appear on Android 8.0+. On Android 13+, a system permission prompt appears after the first channel is created.

5. **Android force-stop kills notifications** — If a user force-stops the app from Android Settings, all scheduled notifications stop. The user must manually reopen the app.

6. **Expo Go limitations (SDK 53+)** — Push notifications don't work in Expo Go on Android. Use a development build. Local notifications still work in Expo Go.

7. **Background task location** — `TaskManager.defineTask()` must be called at **module scope** in an early-loaded file (e.g., `index.ts` or `app/_layout.tsx`), not inside a component or hook.

8. **iOS background notification limits** — Apple rate-limits background/headless notifications to roughly **2-3 per hour**. Exceeding this causes silent drops.

9. **Android splash screen bug** — When launching from a push notification in Android dev builds, the splash screen may fail ~70% of the time. Test in release mode: `npx expo run:android --variant release`.

10. **Token refresh** — Push tokens can change. Use `addPushTokenListener` to detect changes and update your server.

11. **`DEFAULT_ACTION_IDENTIFIER`** — When a user taps the notification body (not an action button), the action identifier is `Notifications.DEFAULT_ACTION_IDENTIFIER` (`expo.modules.notifications.actions.DEFAULT`).

12. **Not all Android launchers support badges** — `getBadgeCountAsync()` may always return `0` on unsupported launchers.

13. **Data payload size limit** — The total push notification payload (including `data`) cannot exceed **4096 bytes**.

## Rate Limits (Expo Push Service)

| Limit | Value |
|-------|-------|
| Notifications per second per project | 600 |
| Notifications per request | 100 |
| Receipt IDs per request | 1,000 |

Exceeding limits returns `TOO_MANY_REQUESTS`, `PUSH_TOO_MANY_NOTIFICATIONS`, or `PUSH_TOO_MANY_RECEIPTS` errors. Implement **exponential backoff** for retries.

## References

- [Official API Docs — expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Push Notifications Overview](https://docs.expo.dev/push-notifications/overview/)
- [Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Sending Notifications (Push API)](https://docs.expo.dev/push-notifications/sending-notifications/)
- [What You Need to Know](https://docs.expo.dev/push-notifications/what-you-need-to-know/)
