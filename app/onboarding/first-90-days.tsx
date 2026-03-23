import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { Trophy } from 'lucide-react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { TimelineStep } from '@/components/onboarding/TimelineStep';
import { CTAButton } from '@/components/onboarding/CTAButton';
import { colors } from '@/constants/theme';

const STEPS = [
  {
    month: 'Month 1',
    title: 'Catch up on overdue maintenance',
    description:
      "We'll identify what's been missed and prioritize the critical tasks first. No guesswork — just a clear action plan.",
  },
  {
    month: 'Month 3',
    title: 'All maintenance on track',
    description:
      'Every service interval tracked, parts ready before you need them. You\'ll never be caught off guard.',
  },
  {
    month: 'Month 6',
    title: 'Full service history & higher resale',
    description:
      'Complete records, lower breakdown risk, and a bike that holds its value when it\'s time to sell or trade up.',
  },
];

export default function First90DaysScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen showProgress={false} title="Your first 90 days with Apex">
      <View style={styles.timelineContainer}>
        {STEPS.map((step, i) => (
          <Animated.View
            key={step.month}
            entering={FadeInLeft.duration(500).delay(300 + i * 250)}
          >
            <TimelineStep
              month={step.month}
              title={step.title}
              description={step.description}
              isLast={i === STEPS.length - 1}
            />
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={FadeInLeft.duration(400).delay(1100)}
        style={styles.resultCard}
      >
        <View style={styles.resultIcon}>
          <Trophy size={20} color={colors.green} />
        </View>
        <Text style={styles.resultText}>
          Riders with 6+ months on Apex report{' '}
          <Text style={styles.resultHighlight}>73% fewer surprise repairs</Text>
        </Text>
      </Animated.View>

      <View style={styles.spacer} />

      <CTAButton
        label="I'm ready"
        onPress={() => router.push('/onboarding/commitment')}
        arrow
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  timelineContainer: {
    marginBottom: 20,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,229,153,0.06)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,153,0.2)',
    gap: 12,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,153,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  resultHighlight: {
    color: colors.green,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
});
