import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Shield, Zap, DollarSign, Map, TrendingUp } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { CTAButton } from '@/components/onboarding/CTAButton';

const OPTIONS = [
  { label: 'Avoid breakdowns', value: 'avoid-breakdowns', icon: Shield },
  { label: 'Keep my bike running perfectly', value: 'reliability', icon: Zap },
  { label: 'Save money on repairs', value: 'save-money', icon: DollarSign },
  { label: 'Prepare for long trips', value: 'trip-prep', icon: Map },
  { label: 'Increase resale value', value: 'resale', icon: TrendingUp },
];

export default function MotivationScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleContinue = () => {
    setField('goal', selected.join(', '));
    router.push('/onboarding/problems');
  };

  return (
    <OnboardingScreen step={2} title="Why do you want to track maintenance?" subtitle="Select all that apply">
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
