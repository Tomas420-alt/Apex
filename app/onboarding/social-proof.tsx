import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Bike, Sparkles, Bell } from 'lucide-react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { CTAButton } from '@/components/onboarding/CTAButton';
import { colors } from '@/constants/theme';

const STEPS = [
  {
    number: '1',
    icon: Bike,
    title: 'Add your bike',
    description: 'Enter your make, model, year, and mileage.',
  },
  {
    number: '2',
    icon: Sparkles,
    title: 'Get your AI plan',
    description: 'A maintenance plan tailored to your exact bike.',
  },
  {
    number: '3',
    icon: Bell,
    title: 'Never miss a service',
    description: 'Smart reminders keep you on track.',
  },
];

export default function HowItWorksScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen showProgress={false} title="">
      <Animated.View
        entering={FadeInUp.duration(500).delay(100)}
        style={styles.header}
      >
        <Text style={styles.title}>How it works</Text>
        <Text style={styles.subtitle}>Three steps to a perfectly maintained bike</Text>
      </Animated.View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Animated.View
              key={step.number}
              entering={FadeInUp.duration(400).delay(300 + i * 150)}
              style={styles.stepRow}
            >
              <View style={styles.stepLeft}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.connector} />}
              </View>
              <View style={styles.stepCard}>
                <View style={styles.stepIconWrapper}>
                  <Icon size={20} color={colors.green} />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <CTAButton
        label="See your plan"
        onPress={() => router.push('/onboarding/plan-preview')}
        arrow
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  steps: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLeft: {
    alignItems: 'center',
    width: 40,
    marginRight: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,229,153,0.15)',
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: 'rgba(0,229,153,0.15)',
    marginVertical: 4,
  },
  stepCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  stepIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,229,153,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
});
