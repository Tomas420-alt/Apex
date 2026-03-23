import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Building2, Gauge, Compass, Mountain, Shuffle } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Commuting', value: 'commuting', icon: Building2 },
  { label: 'Sport / spirited', value: 'sport', icon: Gauge },
  { label: 'Touring', value: 'touring', icon: Compass },
  { label: 'Adventure / off-road', value: 'off-road', icon: Mountain },
  { label: 'Mixed', value: 'mixed', icon: Shuffle },
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
          icon={opt.icon}
          selected={selected === opt.value}
          onPress={handleSelect}
        />
      ))}
    </OnboardingScreen>
  );
}
