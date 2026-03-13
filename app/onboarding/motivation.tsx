import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Avoid breakdowns', value: 'avoid-breakdowns' },
  { label: 'Keep my bike running perfectly', value: 'reliability' },
  { label: 'Save money on repairs', value: 'save-money' },
  { label: 'Prepare for long trips', value: 'trip-prep' },
  { label: 'Increase resale value', value: 'resale' },
];

export default function MotivationScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [selected, setSelected] = useState('');

  const handleSelect = (value: string) => {
    setSelected(value);
    setField('goal', value);
    setTimeout(() => router.push('/onboarding/problems'), 300);
  };

  return (
    <OnboardingScreen step={2} title="Why do you want to track maintenance?">
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
