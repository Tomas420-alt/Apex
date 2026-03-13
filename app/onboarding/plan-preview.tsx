import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Wrench, Droplets, Shield, ClipboardList } from 'lucide-react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { colors } from '@/constants/theme';

const FEATURES = [
  {
    Icon: Droplets,
    title: 'Oil change reminders',
    description: 'Never miss an oil change again',
  },
  {
    Icon: Wrench,
    title: 'Chain maintenance',
    description: 'Keep your chain in perfect condition',
  },
  {
    Icon: Shield,
    title: 'Brake inspections',
    description: 'Stay safe with timely brake checks',
  },
  {
    Icon: ClipboardList,
    title: 'Service history',
    description: 'Track every service in one place',
  },
];

export default function PlanPreviewScreen() {
  const router = useRouter();

  return (
    <OnboardingScreen
      showProgress={false}
      title="Your personalized maintenance plan"
      subtitle="Here's what we'll help you track:"
    >
      <View style={styles.cardsContainer}>
        {FEATURES.map((feature, index) => (
          <Animated.View
            key={feature.title}
            entering={FadeInUp.duration(400).delay((index + 1) * 100)}
            style={styles.featureCard}
          >
            <View style={styles.iconWrapper}>
              <feature.Icon size={24} color={colors.green} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={styles.bottomSpacer} />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/onboarding/reveal')}
      >
        <Text style={styles.buttonText}>Create my maintenance plan</Text>
      </TouchableOpacity>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,229,153,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
