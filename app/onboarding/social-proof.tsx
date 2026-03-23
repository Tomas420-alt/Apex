import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Star } from 'lucide-react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { BigNumber } from '@/components/onboarding/BigNumber';
import { TestimonialCard } from '@/components/onboarding/TestimonialCard';
import { CTAButton } from '@/components/onboarding/CTAButton';
import { colors } from '@/constants/theme';

const TESTIMONIALS = [
  {
    name: 'Jake M.',
    age: 34,
    bike: 'BMW R1250GS',
    quote:
      "Saved €1,800 in my first year. I used to guess when things needed servicing — now I just follow the plan. Never going back.",
  },
  {
    name: 'Sarah K.',
    age: 28,
    bike: 'Yamaha MT-07',
    quote:
      "The breakdown risk alerts caught a chain issue before it became dangerous. This app genuinely keeps me safe on the road.",
  },
  {
    name: 'Chris O.',
    age: 41,
    bike: 'Ducati Monster 821',
    quote:
      "I sold my bike with a full Apex service history and got €2,000 more than similar listings without one.",
  },
];

export default function SocialProofScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen showProgress={false} title="">
      <Animated.View
        entering={FadeInUp.duration(500).delay(100)}
        style={styles.heroSection}
      >
        <Text style={styles.heroPrefix}>Riders trust Apex</Text>
        <BigNumber
          number={12000}
          suffix="+"
          color={colors.green}
          size="large"
          duration={1500}
          delay={200}
        />
        <Text style={styles.heroLabel}>maintenance plans generated</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(400).delay(400)}
        style={styles.ratingRow}
      >
        <View style={styles.stars}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={16}
              color={colors.green}
              fill={colors.green}
            />
          ))}
        </View>
        <Text style={styles.ratingText}>4.8 average rating</Text>
      </Animated.View>

      <View style={styles.testimonials}>
        {TESTIMONIALS.map((t, i) => (
          <Animated.View
            key={t.name}
            entering={FadeInUp.duration(400).delay(600 + i * 150)}
          >
            <TestimonialCard {...t} />
          </Animated.View>
        ))}
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
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroPrefix: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  heroLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stars: {
    flexDirection: 'row',
    gap: 3,
  },
  ratingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  testimonials: {
    gap: 0,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
});
