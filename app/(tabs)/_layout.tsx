import { Redirect } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.getCurrent);

  // All hooks must be called before any early returns
  usePushNotifications();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
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
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="#00f2ff" backgroundColor="rgba(5,5,5,0.92)" blurEffect="systemUltraThinMaterialDark">
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <Label>Calendar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <Label>Plan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pilot">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Pilot</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
