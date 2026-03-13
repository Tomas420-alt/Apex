import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInLeft, FadeIn } from 'react-native-reanimated';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { colors } from '@/constants/theme';

const ANALYSIS_STEPS = [
  { label: 'Analyzing your motorcycle', delay: 0 },
  { label: 'Detecting bike details', delay: 800 },
  { label: 'Checking manufacturer service intervals', delay: 1600 },
  { label: 'Generating your maintenance schedule', delay: 2400 },
  { label: 'Building your garage dashboard', delay: 3200 },
];

export default function AnalysisScreen() {
  const router = useRouter();
  const { data, setFields } = useOnboarding();
  const saveOnboarding = useMutation(api.onboarding.save);

  const [visibleSteps, setVisibleSteps] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const savedRef = useRef(false);

  // Show steps progressively
  useEffect(() => {
    const timers = ANALYSIS_STEPS.map((step, index) =>
      setTimeout(() => {
        setVisibleSteps(index + 1);
      }, step.delay)
    );

    const doneTimer = setTimeout(() => {
      setTimerDone(true);
    }, 4000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, []);

  // Save onboarding data
  useEffect(() => {
    async function run() {
      const notesParts: string[] = [];
      if (data.goal) notesParts.push(`Goal: ${data.goal}`);
      if (data.problem) notesParts.push(`Problem: ${data.problem}`);
      if (data.ridingFrequency) notesParts.push(`Riding frequency: ${data.ridingFrequency}`);
      const notes = notesParts.join('; ');

      const bikeId = await saveOnboarding({
        make: data.make,
        model: data.model,
        year: data.year,
        mileage: data.mileage,
        lastServiceDate: data.lastServiceDate,
        lastServiceMileage: data.lastServiceMileage,
        notes: notes || undefined,
        ridingStyle: data.ridingStyle || undefined,
        annualMileage: data.annualMileage || undefined,
        climate: data.climate || undefined,
        storageType: data.storageType || undefined,
        experienceLevel: data.experienceLevel || undefined,
        maintenanceComfort: data.maintenanceComfort || undefined,
        country: data.country || undefined,
      });

      setFields({ bikeId: bikeId as string });

      // Compute health score
      let score = 100;
      if (data.problem === 'no-tracking') score -= 20;
      else if (['forget-intervals', 'surprise-repairs'].includes(data.problem)) score -= 15;
      else if (['lose-track', 'dont-know'].includes(data.problem)) score -= 10;

      if (data.maintenanceComfort === 'none') score -= 15;
      else if (data.maintenanceComfort === 'beginner') score -= 10;
      else if (data.maintenanceComfort === 'basic') score -= 5;

      if (data.annualMileage > 15000) score -= 10;
      else if (data.annualMileage > 8000) score -= 5;

      if (data.storageType === 'outdoor') score -= 10;
      else if (data.storageType === 'carport') score -= 5;

      if (['cold-wet', 'cold', 'hot-humid'].includes(data.climate)) score -= 10;

      if (data.hasServiceHistory === 'no' || data.hasServiceHistory === 'new') score -= 10;

      score = Math.max(score, 15);

      const maintenanceTracking = Math.min(100, Math.round(score + Math.random() * 10));
      const serviceAwareness = Math.min(100, Math.round(score + Math.random() * 15));
      const breakdownRisk: 'low' | 'medium' | 'high' =
        score > 70 ? 'low' : score > 45 ? 'medium' : 'high';

      setFields({
        healthScore: Math.round(score),
        healthBreakdown: { maintenanceTracking, serviceAwareness, breakdownRisk },
      });

      savedRef.current = true;
    }

    run().catch(console.error);
  }, []);

  // Navigate when both conditions are met
  useEffect(() => {
    if (timerDone && savedRef.current) {
      router.push('/onboarding/health-score');
    }
  }, [timerDone]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.Text entering={FadeIn.duration(400)} style={styles.title}>
        Analyzing your ride...
      </Animated.Text>

      <View style={styles.stepsContainer}>
        {ANALYSIS_STEPS.map((step, index) => {
          if (index >= visibleSteps) return null;

          const isComplete = index < visibleSteps - 1 || (index === ANALYSIS_STEPS.length - 1 && timerDone);

          return (
            <Animated.View
              key={step.label}
              entering={FadeInLeft.duration(400)}
              style={styles.stepRow}
            >
              {isComplete ? (
                <Text style={styles.checkmark}>{'\u2713'}</Text>
              ) : (
                <ActivityIndicator size="small" color={colors.green} />
              )}
              <Text style={[styles.stepLabel, isComplete && styles.stepLabelComplete]}>
                {step.label}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 48,
  },
  stepsContainer: {
    gap: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  checkmark: {
    color: colors.green,
    fontSize: 18,
    fontWeight: '700',
    width: 20,
    textAlign: 'center',
  },
  stepLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    flex: 1,
  },
  stepLabelComplete: {
    color: colors.textPrimary,
  },
});
