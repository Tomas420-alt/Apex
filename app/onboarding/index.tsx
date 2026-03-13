import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getLocales } from 'expo-localization';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { REGION_TO_COUNTRY, getCountryConfig } from '@/constants/localization';
import { colors } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setFields } = useOnboarding();

  // Auto-detect country, currency, and units from device locale
  useEffect(() => {
    try {
      const locales = getLocales();
      const regionCode = locales[0]?.regionCode || '';
      const detectedCountry = REGION_TO_COUNTRY[regionCode] || '';
      if (detectedCountry) {
        const config = getCountryConfig(detectedCountry);
        setFields({
          country: detectedCountry,
          units: config.units,
        });
        console.log(`[Onboarding] Auto-detected: ${detectedCountry} → ${config.units}, ${config.currency}`);
      }
    } catch (e) {
      // Silent fallback — user can set manually later
    }
  }, []);

  return (
    <OnboardingScreen
      title="Keep your motorcycle running perfectly"
      subtitle="We'll create a personalized maintenance system for your bike."
      showProgress={false}
    >
      <View style={styles.spacer} />
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/onboarding/name')}
      >
        <Text style={styles.buttonText}>Start setup</Text>
      </TouchableOpacity>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
