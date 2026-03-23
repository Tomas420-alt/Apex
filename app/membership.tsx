import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Wrench,
  Package,
  Bell,
  Check,
  X,
  Crown,
  Zap,
  RotateCcw,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { useRevenueCat } from '@/hooks/useRevenueCat';

type PlanOption = 'monthly' | 'annual';

const FEATURES_PRO = [
  { icon: Sparkles, label: 'AI-generated maintenance plan', pro: true, free: false },
  { icon: Wrench, label: 'Personalized task scheduling', pro: true, free: false },
  { icon: Package, label: 'Parts list with buy links', pro: true, free: false },
  { icon: ShieldCheck, label: 'Bike inspection checklist', pro: true, free: false },
  { icon: Bell, label: 'Smart maintenance reminders', pro: true, free: true },
  { icon: Zap, label: 'Manual task tracking', pro: true, free: true },
];

export default function MembershipScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>('annual');
  const { isReady, isPro, isLoading, monthlyPackage, annualPackage, purchase, restore } = useRevenueCat();

  const handleSubscribe = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) {
      // RevenueCat not configured or no products available
      if (Platform.OS === 'web') {
        Alert.alert('Not Available', 'Subscriptions are only available on iOS and Android.');
      } else {
        Alert.alert('Not Available', 'Subscription products are not yet configured. Please try again later.');
      }
      return;
    }

    const result = await purchase(pkg);
    if (result.success) {
      router.back();
    } else if (!result.cancelled) {
      Alert.alert('Purchase Failed', result.error ?? 'Something went wrong. Please try again.');
    }
  };

  const handleRestore = async () => {
    const result = await restore();
    if (result.success) {
      if (result.isPro) {
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
        router.back();
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for your account.');
      }
    } else {
      Alert.alert('Restore Failed', result.error ?? 'Something went wrong. Please try again.');
    }
  };

  const handleFreePlan = () => {
    router.back();
  };

  // Show localized prices from RevenueCat if available
  const annualPrice = annualPackage?.product.priceString ?? '$29.99';
  const monthlyPrice = monthlyPackage?.product.priceString ?? '$4.99';
  const annualMonthly = annualPackage
    ? `${(annualPackage.product.price / 12).toFixed(2)}/mo`
    : '2.50/mo';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apex Pro</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.hero}>
          <View style={styles.crownBadge}>
            <Crown size={32} color="#FFD700" />
          </View>
          <Text style={styles.heroTitle}>Unlock Your{'\n'}Maintenance AI</Text>
          <Text style={styles.heroSubtitle}>
            Get a personalized maintenance plan, inspection checklist, and parts list — all powered by AI and tailored to your exact bike.
          </Text>
        </Animated.View>

        {/* Feature comparison */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.featureCard}>
          {/* Column headers */}
          <View style={styles.featureHeaderRow}>
            <Text style={styles.featureHeaderLabel}>What you get</Text>
            <View style={styles.featureHeaderBadges}>
              <Text style={styles.featureHeaderFree}>Free</Text>
              <View style={styles.featureHeaderProBadge}>
                <Text style={styles.featureHeaderPro}>Pro</Text>
              </View>
            </View>
          </View>

          {FEATURES_PRO.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View
                key={index}
                style={[
                  styles.featureRow,
                  index === FEATURES_PRO.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={styles.featureLeft}>
                  <Icon size={18} color={colors.green} />
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </View>
                <View style={styles.featureChecks}>
                  {feature.free ? (
                    <Check size={16} color={colors.textSecondary} />
                  ) : (
                    <X size={16} color={colors.textTertiary} />
                  )}
                  <Check size={16} color={colors.green} />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Plan selection */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.planSection}>
          <Text style={styles.planSectionTitle}>Choose your plan</Text>

          {/* Annual plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.planCardTop}>
              <View style={styles.planRadio}>
                {selectedPlan === 'annual' && <View style={styles.planRadioInner} />}
              </View>
              <View style={styles.planInfo}>
                <View style={styles.planNameRow}>
                  <Text style={styles.planName}>Annual</Text>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>Save 50%</Text>
                  </View>
                </View>
                <Text style={styles.planBreakdown}>
                  Just {annualMonthly} billed annually
                </Text>
              </View>
              <Text style={styles.planPrice}>{annualPrice}<Text style={styles.planPricePeriod}>/yr</Text></Text>
            </View>
          </TouchableOpacity>

          {/* Monthly plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.planCardTop}>
              <View style={styles.planRadio}>
                {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planBreakdown}>Cancel anytime</Text>
              </View>
              <Text style={styles.planPrice}>{monthlyPrice}<Text style={styles.planPricePeriod}>/mo</Text></Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Social proof */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.socialProof}>
          <Text style={styles.socialProofText}>
            12,000+ riders trust Apex to keep their bikes in peak condition
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Sticky CTA */}
      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handleSubscribe}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <Sparkles size={20} color="#000000" />
              <Text style={styles.ctaText}>
                Upgrade to Pro
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.ctaDisclaimer}>
          Cancel anytime. Subscription renews automatically.
        </Text>
        <View style={styles.ctaLinks}>
          <TouchableOpacity onPress={handleRestore} activeOpacity={0.7} disabled={isLoading}>
            <Text style={styles.restoreLink}>Restore Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFreePlan} activeOpacity={0.7}>
            <Text style={styles.freePlanLink}>Continue with free plan</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
  },
  crownBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // Feature comparison card
  featureCard: {
    backgroundColor: colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureHeaderLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  featureHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureHeaderFree: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 32,
    textAlign: 'center',
  },
  featureHeaderProBadge: {
    backgroundColor: 'rgba(0,229,153,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  featureHeaderPro: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  featureChecks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: 80,
    justifyContent: 'flex-end',
  },

  // Plan selection
  planSection: {
    marginBottom: 16,
    gap: 10,
  },
  planSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  planCard: {
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
  },
  planCardSelected: {
    borderColor: colors.green,
    backgroundColor: 'rgba(0,229,153,0.06)',
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bestValueBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  planBreakdown: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planPricePeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Social proof
  socialProof: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  socialProofText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // CTA
  ctaContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    gap: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
  },
  ctaDisclaimer: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  restoreLink: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
    paddingVertical: 4,
  },
  freePlanLink: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
});
