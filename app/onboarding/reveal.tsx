import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { colors } from '@/constants/theme';

export default function RevealScreen() {
  const router = useRouter();
  const { data } = useOnboarding();

  const score = data.healthScore || 42;
  const bikeName = [data.make, data.model].filter(Boolean).join(' ') || 'Your Bike';
  const bikeYear = data.year || '';

  return (
    <OnboardingScreen showProgress={false} title="">
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
          style={styles.scoreBadge}
        >
          <Text style={styles.scoreBadgeText}>Health Score: {score}</Text>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.duration(600).delay(data.photoUrl ? 800 : 400)}
          style={styles.serviceHint}
        >
          Next service coming soon
        </Animated.Text>
      </View>

      <View style={styles.bottomSpacer} />

      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.buttonText}>Enter my garage</Text>
      </TouchableOpacity>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  bikeImage: {
    width: '100%',
    height: 250,
    borderRadius: 20,
  },
  details: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bikeName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bikeYear: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scoreBadge: {
    backgroundColor: 'rgba(0,229,153,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  scoreBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.green,
  },
  serviceHint: {
    fontSize: 15,
    color: colors.textSecondary,
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
