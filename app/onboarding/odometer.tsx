import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { colors } from '@/constants/theme';

export default function OdometerScreen() {
  const router = useRouter();
  const { setFields } = useOnboarding();
  const [mileage, setMileage] = useState('');
  const [units, setUnits] = useState<'km' | 'miles'>('km');

  const isValid = mileage.trim() !== '' && Number(mileage) > 0;

  const handleContinue = () => {
    if (!isValid) return;
    const raw = Number(mileage);
    const convertedValue = units === 'miles' ? Math.round(raw * 1.60934) : raw;
    setFields({ mileage: convertedValue, units });
    router.push('/onboarding/service-history');
  };

  return (
    <OnboardingScreen step={12} title="What's the current mileage?" keyboardAvoiding>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.mileageInput}
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          value={mileage}
          onChangeText={setMileage}
          keyboardType="numeric"
          maxLength={7}
        />

        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, units === 'km' && styles.toggleButtonActive]}
            activeOpacity={0.8}
            onPress={() => setUnits('km')}
          >
            <Text style={[styles.toggleText, units === 'km' && styles.toggleTextActive]}>
              km
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, units === 'miles' && styles.toggleButtonActive]}
            activeOpacity={0.8}
            onPress={() => setUnits('miles')}
          >
            <Text style={[styles.toggleText, units === 'miles' && styles.toggleTextActive]}>
              miles
            </Text>
          </TouchableOpacity>
        </View>
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
  inputContainer: {
    alignItems: 'center',
    paddingTop: 32,
  },
  mileageInput: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 200,
    paddingVertical: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: colors.surface2,
  },
  toggleButtonActive: {
    backgroundColor: colors.green,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#FFFFFF',
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
