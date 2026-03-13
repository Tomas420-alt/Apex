import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Commuting', value: 'commuting' },
  { label: 'Sport / spirited', value: 'sport' },
  { label: 'Touring', value: 'touring' },
  { label: 'Adventure / off-road', value: 'off-road' },
  { label: 'Mixed', value: 'mixed' },
];

export default function RidingStyleScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [selected, setSelected] = useState('');

  const handleSelect = (value: string) => {
    setSelected(value);
    setField('ridingStyle', value);
    setTimeout(() => router.push('/onboarding/riding-frequency'), 300);
  };

  return (
    <OnboardingScreen step={4} title="What type of riding do you mostly do?">
      {OPTIONS.map((opt) => (
        <SelectionCard
          key={opt.value}
          label={opt.label}
          value={opt.value}
          selected={selected === opt.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
