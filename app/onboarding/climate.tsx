import React from 'react';
import { useRouter } from 'expo-router';
import { Sun, Palmtree, Leaf, CloudRain, Snowflake, Rainbow } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Hot & dry', value: 'hot-dry', icon: Sun },
  { label: 'Hot & humid', value: 'hot-humid', icon: Palmtree },
  { label: 'Temperate', value: 'temperate', icon: Leaf },
  { label: 'Cold & wet', value: 'cold-wet', icon: CloudRain },
  { label: 'Snow / winter', value: 'cold', icon: Snowflake },
  { label: 'Mixed', value: 'mixed', icon: Rainbow },
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
          icon={option.icon}
          selected={data.climate === option.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
