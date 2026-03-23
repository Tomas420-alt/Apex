import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { CTAButton } from '@/components/onboarding/CTAButton';
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

      {isValid && (
        <Animated.Text
          entering={FadeInUp.duration(300)}
          style={styles.greeting}
        >
          Nice to meet you, {name.trim()}!
        </Animated.Text>
      )}

      <View style={styles.spacer} />

      <CTAButton
        label="Continue"
        onPress={handleContinue}
        disabled={!isValid}
        arrow
      />
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
  greeting: {
    fontSize: 16,
    color: colors.green,
    fontWeight: '600',
    marginTop: 16,
  },
  spacer: {
    flex: 1,
  },
});
