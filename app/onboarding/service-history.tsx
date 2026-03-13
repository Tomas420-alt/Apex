import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { colors } from '@/constants/theme';

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const { data, setField, setFields } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(null);
  const [lastServiceDate, setLastServiceDate] = useState('');
  const [lastServiceMileage, setLastServiceMileage] = useState('');

  const handleSelect = (value: string) => {
    setSelected(value);
    setField('hasServiceHistory', value as 'yes' | 'no' | 'new');

    if (value !== 'yes') {
      setTimeout(() => router.push('/onboarding/bike-photo'), 300);
    }
  };

  const canSubmit =
    selected === 'yes' && lastServiceDate.trim() !== '' && lastServiceMileage.trim() !== '';

  const handleContinue = () => {
    if (!canSubmit) return;
    const rawMileage = Number(lastServiceMileage);
    const convertedMileage =
      data.units === 'miles' ? Math.round(rawMileage * 1.60934) : rawMileage;

    setFields({
      hasServiceHistory: 'yes',
      lastServiceDate: lastServiceDate.trim(),
      lastServiceMileage: convertedMileage,
    });
    router.push('/onboarding/bike-photo');
  };

  return (
    <OnboardingScreen step={13} title="Has your bike been serviced recently?">
      <SelectionCard
        label="Yes, recently"
        value="yes"
        selected={selected === 'yes'}
        onPress={handleSelect}
      />
      <SelectionCard
        label="No"
        value="no"
        selected={selected === 'no'}
        onPress={handleSelect}
      />
      <SelectionCard
        label="Just bought it"
        value="new"
        selected={selected === 'new'}
        onPress={handleSelect}
      />

      {selected === 'yes' && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.extraFields}>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={lastServiceDate}
            onChangeText={setLastServiceDate}
            maxLength={10}
            returnKeyType="next"
          />
          <TextInput
            style={[styles.input, styles.inputLast]}
            placeholder={`e.g. 10000 (${data.units})`}
            placeholderTextColor={colors.textTertiary}
            value={lastServiceMileage}
            onChangeText={setLastServiceMileage}
            keyboardType="numeric"
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={handleContinue}
            disabled={!canSubmit}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  extraFields: {
    marginTop: 20,
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 20,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 17,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  inputLast: {
    borderBottomWidth: 0,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
