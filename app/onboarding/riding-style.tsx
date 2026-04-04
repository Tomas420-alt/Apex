import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Building2, Gauge, Compass, Mountain, Shuffle } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { CTAButton } from '@/components/onboarding/CTAButton';

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
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleContinue = () => {
    setField('ridingStyle', selected.join(', '));
    router.push('/onboarding/riding-frequency');
  };

  return (
    <OnboardingScreen step={4} title="What type of riding do you mostly do?" subtitle="Select all that apply">
      {OPTIONS.map((opt) => (
        <SelectionCard
          key={opt.value}
          label={opt.label}
          value={opt.value}
          icon={opt.icon}
          selected={selected.includes(opt.value)}
          onPress={toggleOption}
        />
      ))}
      <CTAButton
        label="Continue"
        onPress={handleContinue}
        disabled={selected.length === 0}
        arrow
      />
    </OnboardingScreen>
  );
}
