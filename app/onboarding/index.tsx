import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { getLocales } from 'expo-localization';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { CTAButton } from '@/components/onboarding/CTAButton';
import { REGION_TO_COUNTRY, getCountryConfig } from '@/constants/localization';
import { colors } from '@/constants/theme';
import { HeadlightDRL } from '@/components/onboarding/HeadlightDRL';

const PILLS = ['AI-powered', 'Personalized', 'Smart reminders'];

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
        if (__DEV__) console.log(`[Onboarding] Auto-detected: ${detectedCountry} → ${config.units}, ${config.currency}`);
      }
    } catch (e) {
      // Silent fallback — user can set manually later
    }
  }, []);

  return (
    <OnboardingScreen
      title="Your bike deserves better"
      subtitle="Join 12,000+ riders who never miss a service"
      showProgress={false}
      showBack={false}
    >
      <Animated.View
        entering={FadeInUp.duration(400).delay(300)}
        style={styles.pillsRow}
      >
        {PILLS.map((pill) => (
          <View key={pill} style={styles.pill}>
            <Text style={styles.pillText}>{pill}</Text>
          </View>
        ))}
      </Animated.View>

      <View style={styles.spacer} />

      {/* Headlight DRL animation */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(500)}
        style={styles.headlightContainer}
      >
        <HeadlightDRL />
      </Animated.View>

      <View style={styles.spacer} />

      <CTAButton
        label="Get started"
        onPress={() => router.push('/onboarding/name')}
        arrow
      />
      <Animated.Text
        entering={FadeInUp.duration(300).delay(400)}
        style={styles.frictionText}
      >
        Takes 2 minutes
      </Animated.Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pill: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,153,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,229,153,0.06)',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
  headlightContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  frictionText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
  },
});
