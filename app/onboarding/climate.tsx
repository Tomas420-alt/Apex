import React from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Hot & dry', value: 'hot-dry' },
  { label: 'Hot & humid', value: 'hot-humid' },
  { label: 'Temperate', value: 'temperate' },
  { label: 'Cold & wet', value: 'cold-wet' },
  { label: 'Snow / winter', value: 'cold' },
  { label: 'Mixed', value: 'mixed' },
];

export default function ClimateScreen() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  const handleSelect = (value: string) => {
    setField('climate', value);
    setTimeout(() => router.push('/onboarding/storage'), 300);
  };

  return (
    <OnboardingScreen step={7} title="What climate do you usually ride in?">
      {OPTIONS.map((option) => (
        <SelectionCard
          key={option.value}
          label={option.label}
          value={option.value}
          selected={data.climate === option.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
