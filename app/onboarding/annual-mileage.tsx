import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Turtle, Footprints, Bike, Rocket, Flame } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'Under 3,000 km', value: '2000', icon: Turtle },
  { label: '3,000 - 8,000 km', value: '5000', icon: Footprints },
  { label: '8,000 - 15,000 km', value: '12000', icon: Bike },
  { label: '15,000 - 25,000 km', value: '20000', icon: Rocket },
  { label: 'Over 25,000 km', value: '30000', icon: Flame },
];

export default function AnnualMileageScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [selected, setSelected] = useState('');

  const handleSelect = (value: string) => {
    setSelected(value);
    setField('annualMileage', Number(value));
    setTimeout(() => router.push('/onboarding/climate'), 300);
  };

  return (
    <OnboardingScreen step={6} title="How many km do you ride per year?">
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
