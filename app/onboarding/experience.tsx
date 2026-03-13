import React from 'react';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Less than a year', value: 'beginner' },
  { label: '1-3 years', value: 'intermediate' },
  { label: '3-10 years', value: 'advanced' },
  { label: '10+ years', value: 'expert' },
];

export default function ExperienceScreen() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  const handleSelect = (value: string) => {
    setField('experienceLevel', value);
    setTimeout(() => router.push('/onboarding/maintenance-skill'), 300);
  };

  return (
    <OnboardingScreen step={9} title="How long have you been riding?">
      {OPTIONS.map((option) => (
        <SelectionCard
          key={option.value}
          label={option.label}
          value={option.value}
          selected={data.experienceLevel === option.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
