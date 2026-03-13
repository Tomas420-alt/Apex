import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { colors } from '@/constants/theme';

export default function NameScreen() {
  const router = useRouter();
  const { setField } = useOnboarding();
  const [name, setName] = useState('');

  const isValid = name.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    setField('name', name.trim());
    router.push('/onboarding/motivation');
  };

  return (
    <OnboardingScreen
      step={1}
      title="What should we call you?"
      keyboardAvoiding={true}
    >
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textTertiary}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleContinue}
      />
      <View style={styles.inputBorder} />

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
  input: {
    fontSize: 20,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  inputBorder: {
    height: 1.5,
    backgroundColor: colors.border,
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
