import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { colors } from '@/constants/theme';

export default function BikeDetailsScreen() {
  const router = useRouter();
  const { setFields } = useOnboarding();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  const isValid = make.trim() !== '' && model.trim() !== '' && year.trim() !== '';

  const handleContinue = () => {
    if (!isValid) return;
    setFields({ make: make.trim(), model: model.trim(), year: Number(year) });
    router.push('/onboarding/odometer');
  };

  return (
    <OnboardingScreen step={11} title="Tell us about your bike" keyboardAvoiding>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="e.g. Honda, Yamaha"
          placeholderTextColor={colors.textTertiary}
          value={make}
          onChangeText={setMake}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="e.g. CBR600RR, MT-07"
          placeholderTextColor={colors.textTertiary}
          value={model}
          onChangeText={setModel}
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextInput
          style={[styles.input, styles.inputLast]}
          placeholder="e.g. 2023"
          placeholderTextColor={colors.textTertiary}
          value={year}
          onChangeText={setYear}
          keyboardType="numeric"
          maxLength={4}
          returnKeyType="done"
        />
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.button, !isValid && styles.buttonDisabled]}
        activeOpacity={0.8}
        onPress={handleContinue}
        disabled={!isValid}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
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
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 32,
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
