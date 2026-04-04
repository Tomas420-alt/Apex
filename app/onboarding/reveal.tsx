import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Wrench } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { HealthScoreRing } from '@/components/onboarding/HealthScoreRing';
import { CTAButton } from '@/components/onboarding/CTAButton';
import { colors } from '@/constants/theme';

export default function RevealScreen() {
  const router = useRouter();
  const { data } = useOnboarding();

  const score = data.healthScore || 42;
  const bikeName = [data.make, data.model].filter(Boolean).join(' ') || 'Your Bike';
  const bikeYear = data.year || '';

  // Compute oil change due text dynamically
  const getOilChangeDueText = () => {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (data.lastServiceDate) {
      const lastService = new Date(data.lastServiceDate);
      const daysSinceService = Math.floor(
        (now.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Oil change every ~6 months (182 days) or 5000km
      // Estimate days remaining based on annual mileage
      const dailyKm = (data.annualMileage || 5000) / 365;
      const kmSinceService = dailyKm * daysSinceService;
      const daysUntilKmLimit = dailyKm > 0
        ? Math.floor((5000 - kmSinceService) / dailyKm)
        : 182;
      const daysUntilTimeLimit = 182 - daysSinceService;
      const daysRemaining = Math.min(daysUntilKmLimit, daysUntilTimeLimit);

      if (daysRemaining <= 0) return 'Due soon';
      if (daysRemaining <= 14) return `Due in ${daysRemaining} days`;
      if (daysRemaining <= 60) return `Due in ~${Math.round(daysRemaining / 7)} weeks`;
      return `Due in ~${Math.round(daysRemaining / 30)} months`;
    }

    // No lastServiceDate — estimate from mileage and year
    const mileage = data.mileage || 0;
    const year = data.year ? parseInt(String(data.year), 10) : 0;

    if (mileage < 5000 || (year && year >= currentYear - 1)) {
      return 'Due in ~3 months';
    }
    if (mileage > 10000) {
      return 'Due soon';
    }
    return 'Due in ~30 days';
  };

  const oilChangeDueText = getOilChangeDueText();

  return (
    <OnboardingScreen showProgress={false} title="" showBack={false}>
      <View style={styles.content}>
        {data.photoUrl ? (
          <Animated.View entering={FadeIn.duration(800)} style={styles.imageWrapper}>
            <Image
              source={{ uri: data.photoUrl }}
              style={styles.bikeImage}
              resizeMode="cover"
            />
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInUp.duration(600).delay(data.photoUrl ? 400 : 0)}
          style={styles.details}
        >
          <Text style={styles.bikeName}>{bikeName}</Text>
          {bikeYear ? <Text style={styles.bikeYear}>{bikeYear}</Text> : null}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(600).delay(data.photoUrl ? 600 : 200)}
          style={styles.ringWrapper}
        >
          <HealthScoreRing score={score} size={120} strokeWidth={10} delay={data.photoUrl ? 700 : 300} />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(600).delay(data.photoUrl ? 900 : 500)}
          style={styles.taskPreview}
        >
          <Text style={styles.taskPreviewLabel}>Your first maintenance task</Text>
          <View style={styles.taskPreviewCard}>
            <View style={styles.taskIconWrapper}>
              <Wrench size={18} color={colors.orange} />
            </View>
            <View style={styles.taskPreviewText}>
              <Text style={styles.taskPreviewTitle}>Oil Change</Text>
              <Text style={styles.taskPreviewDue}>{oilChangeDueText}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.bottomSpacer} />

      <CTAButton
        label="Enter my garage"
        onPress={() => router.replace('/(tabs)')}
        arrow
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  bikeImage: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  details: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bikeName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  bikeYear: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ringWrapper: {
    marginBottom: 20,
  },
  taskPreview: {
    width: '100%',
  },
  taskPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  taskPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  taskIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,159,67,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskPreviewText: {
    flex: 1,
  },
  taskPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  taskPreviewDue: {
    fontSize: 13,
    color: colors.orange,
    fontWeight: '500',
  },
  bottomSpacer: {
    flex: 1,
  },
});
