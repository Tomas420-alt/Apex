import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ProgressBar } from './ProgressBar';
import { colors } from '@/constants/theme';

const TOTAL_STEPS = 16;

interface OnboardingScreenProps {
  step?: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showProgress?: boolean;
  keyboardAvoiding?: boolean;
  showBack?: boolean;
}

export function OnboardingScreen({
  step,
  title,
  subtitle,
  children,
  showProgress = true,
  keyboardAvoiding = false,
  showBack = true,
}: OnboardingScreenProps) {
  const router = useRouter();

  const canGoBack = router.canGoBack();

  const content = (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {showBack && canGoBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>

      {showProgress && step != null && (
        <ProgressBar step={step} totalSteps={TOTAL_STEPS} />
      )}

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          style={styles.body}
        >
          {children}
        </Animated.View>
      </View>
    </SafeAreaView>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  body: {
    flex: 1,
    marginTop: 24,
  },
});
