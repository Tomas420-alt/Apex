import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Repeat, CalendarCheck, CalendarClock, Calendar } from 'lucide-react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Every ride', value: 'every-ride', icon: Repeat, trailingText: '12% choose this' },
  { label: 'Weekly', value: 'weekly', icon: CalendarCheck, trailingText: '54% choose this', subtitle: 'Most popular' },
  { label: 'Bi-weekly', value: 'biweekly', icon: CalendarClock, trailingText: '28% choose this' },
  { label: 'Monthly', value: 'monthly', icon: Calendar, trailingText: '6% choose this' },
];

export default function CommitmentScreen() {
  const router = useRouter();

  const handleSelect = (_value: string) => {
    setTimeout(() => router.push('/onboarding/reveal'), 300);
  };

  return (
    <OnboardingScreen
      showProgress={false}
      title="How often will you check your bike?"
      subtitle="Pick what works for your schedule"
    >
      <View style={styles.options}>
        {OPTIONS.map((option, i) => (
          <Animated.View
            key={option.value}
            entering={FadeInUp.duration(400).delay(200 + i * 100)}
          >
            <SelectionCard
              label={option.label}
              value={option.value}
              icon={option.icon}
              subtitle={option.subtitle}
              trailingText={option.trailingText}
              onPress={handleSelect}
            />
          </Animated.View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 0,
  },
});
