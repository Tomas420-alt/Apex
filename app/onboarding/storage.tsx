import React from 'react';
import { useRouter } from 'expo-router';
import { Home, Umbrella, CloudSun, Shuffle } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Garage', value: 'garage', icon: Home },
  { label: 'Covered', value: 'carport', icon: Umbrella },
  { label: 'Outdoors', value: 'outdoor', icon: CloudSun },
  { label: 'Mixed', value: 'mixed', icon: Shuffle },
];

export default function StorageScreen() {
  const router = useRouter();
  const { data, setField } = useOnboarding();

  const handleSelect = (value: string) => {
    setField('storageType', value);
    setTimeout(() => router.push('/onboarding/experience'), 300);
  };

  return (
    <OnboardingScreen step={8} title="Where is your motorcycle usually stored?">
      {OPTIONS.map((option) => (
        <SelectionCard
          key={option.value}
          label={option.label}
          value={option.value}
          icon={option.icon}
          selected={data.storageType === option.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
