import { Redirect } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.getCurrent);

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
    <NativeTabs minimizeBehavior="onScrollDown" tintColor="#00E599">
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'bicycle', selected: 'bicycle' }} />
        <Label>Garage</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="maintenance">
        <Icon sf={{ default: 'wrench', selected: 'wrench.fill' }} />
        <Label>Maintenance</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gear', selected: 'gear' }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
