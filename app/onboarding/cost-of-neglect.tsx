import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { AlertTriangle, TrendingDown, DollarSign } from 'lucide-react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { BigNumber } from '@/components/onboarding/BigNumber';
import { CTAButton } from '@/components/onboarding/CTAButton';
import { colors } from '@/constants/theme';

const COSTS = [
  {
    Icon: AlertTriangle,
    amount: 850,
    label: 'Average emergency repair',
    color: colors.orange,
    delay: 200,
  },
  {
    Icon: TrendingDown,
    amount: 3500,
    label: 'Engine rebuild from missed oil changes',
    color: colors.red,
    delay: 500,
  },
  {
    Icon: DollarSign,
    amount: 1200,
    label: 'Preventable breakdown tow + repair',
    color: colors.red,
    delay: 800,
  },
];

export default function CostOfNeglectScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      showProgress={false}
      title="The real cost of skipping maintenance"
      subtitle="What riders without maintenance tracking pay"
    >
      <View style={styles.costsContainer}>
        {COSTS.map((cost, index) => (
          <Animated.View
            key={cost.label}
            entering={FadeInUp.duration(500).delay(cost.delay)}
            style={styles.costCard}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${cost.color}15` }]}>
              <cost.Icon size={22} color={cost.color} />
            </View>
            <View style={styles.costText}>
              <BigNumber
                number={cost.amount}
                prefix="€"
                color={cost.color}
                size="medium"
                duration={1000}
                delay={cost.delay + 200}
              />
              <Text style={styles.costLabel}>{cost.label}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={FadeInUp.duration(500).delay(1200)}
        style={styles.savingsCard}
      >
        <Text style={styles.savingsLabel}>
          Riders who track maintenance save an average of
        </Text>
        <View style={styles.savingsAmount}>
          <BigNumber
            number={2100}
            prefix="€"
            suffix="/year"
            color={colors.green}
            size="medium"
            duration={1200}
            delay={1400}
          />
        </View>
      </Animated.View>

      <View style={styles.spacer} />

      <CTAButton
        label="See your bike's health"
        onPress={() => router.push('/onboarding/health-score')}
        arrow
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  costsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  costCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  costText: {
    flex: 1,
  },
  costLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  savingsCard: {
    backgroundColor: 'rgba(0,229,153,0.06)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,153,0.2)',
    alignItems: 'center',
  },
  savingsLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  savingsAmount: {
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
});
