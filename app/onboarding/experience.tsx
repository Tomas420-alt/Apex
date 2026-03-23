import React from 'react';
import { useRouter } from 'expo-router';
import { Sprout, Bike, Target, Crown } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Less than a year', value: 'beginner', icon: Sprout },
  { label: '1-3 years', value: 'intermediate', icon: Bike },
  { label: '3-10 years', value: 'advanced', icon: Target },
  { label: '10+ years', value: 'expert', icon: Crown },
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
          icon={option.icon}
          selected={data.experienceLevel === option.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
