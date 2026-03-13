import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { HealthScoreRing } from '@/components/onboarding/HealthScoreRing';
import { colors } from '@/constants/theme';

export default function PotentialScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen showProgress={false} title="With proper maintenance tracking">
      <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.ringWrapper}>
        <HealthScoreRing score={88} delay={300} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.card}>
        <View style={[styles.metricRow, styles.metricBorder]}>
          <Text style={styles.metricLabel}>Bike Health Score</Text>
          <Text style={styles.metricValue}>88</Text>
        </View>
        <View style={[styles.metricRow, styles.metricBorder]}>
          <Text style={styles.metricLabel}>Breakdown Risk</Text>
          <Text style={[styles.metricValue, { color: colors.green }]}>Low</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Maintenance Alerts</Text>
          <Text style={[styles.metricValue, { color: colors.green }]}>Active</Text>
        </View>
      </Animated.View>

      <View style={styles.bottomSpacer} />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/onboarding/plan-preview')}
      >
        <Text style={styles.buttonText}>See your plan</Text>
      </TouchableOpacity>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
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
