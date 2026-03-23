import React from 'react';
import { useRouter } from 'expo-router';
import { Ban, BookOpen, Wrench, Settings, PocketKnife } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: "I don't touch it", value: 'none', icon: Ban },
  { label: 'Learning the basics', value: 'beginner', icon: BookOpen },
  { label: 'Basic stuff (oil, chain)', value: 'basic', icon: Wrench },
  { label: 'Intermediate (brakes, filters)', value: 'intermediate', icon: Settings },
  { label: 'I do everything myself', value: 'advanced', icon: PocketKnife },
];

export default function MaintenanceSkillScreen() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  const handleSelect = (value: string) => {
    setField('maintenanceComfort', value);
    setTimeout(() => router.push('/onboarding/bike-details'), 300);
  };

  return (
    <OnboardingScreen step={10} title="How comfortable are you with motorcycle maintenance?">
      {OPTIONS.map((option) => (
        <SelectionCard
          key={option.value}
          label={option.label}
          value={option.value}
          icon={option.icon}
          selected={data.maintenanceComfort === option.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
