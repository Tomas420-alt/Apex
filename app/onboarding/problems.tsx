import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Clock, ListX, AlertTriangle, HelpCircle, XCircle } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';

const OPTIONS = [
  { label: 'I forget service intervals', value: 'forget-intervals', icon: Clock },
  { label: 'I lose track of maintenance', value: 'lose-track', icon: ListX },
  { label: 'Repairs surprise me', value: 'surprise-repairs', icon: AlertTriangle },
  { label: "I don't know what needs servicing", value: 'dont-know', icon: HelpCircle },
  { label: "I don't track maintenance at all", value: 'no-tracking', icon: XCircle },
];

export default function ProblemsScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [selected, setSelected] = useState('');

  const handleSelect = (value: string) => {
    setSelected(value);
    setField('problem', value);
    setTimeout(() => router.push('/onboarding/riding-style'), 300);
  };

  return (
    <OnboardingScreen step={3} title="What maintenance problems do you run into?">
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
