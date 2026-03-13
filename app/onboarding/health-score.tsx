import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { HealthScoreRing } from '@/components/onboarding/HealthScoreRing';
import { colors } from '@/constants/theme';

export default function HealthScoreScreen() {
  const router = useRouter();
  const { data } = useOnboarding();

  const score = data.healthScore || 42;
  const breakdown = data.healthBreakdown || {
    maintenanceTracking: 35,
    serviceAwareness: 40,
    breakdownRisk: 'high' as const,
  };

  const riskColor =
    breakdown.breakdownRisk === 'low'
      ? colors.green
      : breakdown.breakdownRisk === 'medium'
        ? colors.orange
        : colors.red;

  return (
    <OnboardingScreen showProgress={false} title="Based on your riding habits...">
      <Animated.Text
        entering={FadeInUp.duration(400).delay(100)}
        style={styles.insight}
      >
        Riders with similar habits often miss 2-3 maintenance intervals per year.
      </Animated.Text>

      <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.ringWrapper}>
        <HealthScoreRing score={score} delay={400} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.card}>
        <View style={[styles.metricRow, styles.metricBorder]}>
          <Text style={styles.metricLabel}>Maintenance Tracking</Text>
          <Text style={styles.metricValue}>{breakdown.maintenanceTracking}</Text>
        </View>
        <View style={[styles.metricRow, styles.metricBorder]}>
          <Text style={styles.metricLabel}>Service Awareness</Text>
          <Text style={styles.metricValue}>{breakdown.serviceAwareness}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Breakdown Risk</Text>
          <Text style={[styles.metricValue, { color: riskColor }]}>
            {breakdown.breakdownRisk.charAt(0).toUpperCase() +
              breakdown.breakdownRisk.slice(1)}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.bottomSpacer} />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/onboarding/potential')}
      >
        <Text style={styles.buttonText}>See your potential</Text>
      </TouchableOpacity>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  insight: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 24,
  },
  ringWrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  metricLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bottomSpacer: {
    flex: 1,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
