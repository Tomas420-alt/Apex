import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Sun, CalendarDays, PartyPopper, Cloud, Snowflake } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Daily', value: 'daily', icon: Sun },
  { label: 'Several times per week', value: 'several-weekly', icon: CalendarDays },
  { label: 'Weekends', value: 'weekends', icon: PartyPopper },
  { label: 'Occasionally', value: 'occasional', icon: Cloud },
  { label: 'Seasonal', value: 'seasonal', icon: Snowflake },
];

export default function RidingFrequencyScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [selected, setSelected] = useState('');

  const handleSelect = (value: string) => {
    setSelected(value);
    setField('ridingFrequency', value);
    setTimeout(() => router.push('/onboarding/annual-mileage'), 300);
  };

  return (
    <OnboardingScreen step={5} title="How often do you ride?">
      {OPTIONS.map((opt) => (
        <SelectionCard
          key={opt.value}
          label={opt.label}
          value={opt.value}
          icon={opt.icon}
          selected={selected === opt.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
