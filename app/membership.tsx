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
  Brain,
  ShoppingCart,
  FileText,
  RotateCcw,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { useRevenueCat } from '@/hooks/useRevenueCat';

type PlanOption = 'monthly' | 'annual';

const BENEFITS = [
  {
    icon: Brain,
    title: 'AI Maintenance Engine',
    subtitle: 'Dynamic plans for your riding style',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Parts Procurement',
    subtitle: 'Direct buy links for your exact model',
  },
  {
    icon: FileText,
    title: 'Export Service Passport',
    subtitle: 'Verified history for resale',
  },
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
      // Brief delay to let subscription status sync to Convex
      await new Promise(resolve => setTimeout(resolve, 1500));
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
        {/* Hero Title */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.hero}>
          <Text style={styles.heroTitle}>
            UNLEASH THE{'\n'}
            <Text style={styles.heroTitleCyan}>FULL MACHINE</Text>
          </Text>
        </Animated.View>

        {/* Benefits */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.benefitsSection}>
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <View key={index} style={styles.benefitRow}>
                <View style={styles.benefitIconWrap}>
                  <Icon size={22} color={colors.green} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Plan selection */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.planSection}>
          {/* Annual plan — cyan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardAnnual,
              selectedPlan === 'annual' && styles.planCardAnnualSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.planCardTop}>
              <View style={[styles.planRadio, styles.planRadioAnnual]}>
                {selectedPlan === 'annual' && <View style={styles.planRadioInnerAnnual} />}
              </View>
              <View style={styles.planInfo}>
                <View style={styles.planNameRow}>
                  <Text style={[styles.planName, styles.planNameAnnual]}>Annual</Text>
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>SAVE 50%</Text>
                  </View>
                </View>
                <Text style={styles.planBreakdownAnnual}>
                  Just {annualMonthly} billed annually
                </Text>
              </View>
              <Text style={[styles.planPrice, styles.planPriceAnnual]}>
                {annualPrice}<Text style={styles.planPricePeriodAnnual}>/yr</Text>
              </Text>
            </View>
          </TouchableOpacity>

          {/* Monthly plan — dark */}
          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardMonthly,
              selectedPlan === 'monthly' && styles.planCardMonthlySelected,
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
            <Text style={styles.ctaText}>UPGRADE TO PRO</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.ctaDisclaimer}>
          Auto-renews. Cancel anytime.{'\n'}Subscription renews unless cancelled at least 24hrs before period end.
        </Text>
        <TouchableOpacity onPress={handleRestore} activeOpacity={0.7} disabled={isLoading}>
          <Text style={styles.restoreLink}>Restore Purchases</Text>
        </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    fontStyle: 'italic',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    lineHeight: 42,
    letterSpacing: 1,
  },
  heroTitleCyan: {
    color: colors.green,
  },

  // Benefits
  benefitsSection: {
    marginBottom: 28,
    gap: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,242,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  benefitSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Plan selection
  planSection: {
    gap: 10,
    marginBottom: 16,
  },

  // Annual plan card — cyan bg
  planCard: {
    borderRadius: 14,
    padding: 16,
  },
  planCardAnnual: {
    backgroundColor: colors.green,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 15px rgba(0,242,255,0.3)' }
      : {}),
  },
  planCardAnnualSelected: {
    // glow is always on for annual
  },
  planCardMonthly: {
    backgroundColor: colors.surface1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  planCardMonthlySelected: {
    borderColor: colors.textSecondary,
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
  planRadioAnnual: {
    borderColor: 'rgba(0,0,0,0.3)',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
  },
  planRadioInnerAnnual: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
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
  planNameAnnual: {
    color: '#000000',
  },
  bestValueBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  planBreakdown: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planBreakdownAnnual: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planPriceAnnual: {
    color: '#000000',
  },
  planPricePeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  planPricePeriodAnnual: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.5)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 2,
  },
  ctaDisclaimer: {
    fontSize: 10,
    color: colors.textTertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  restoreLink: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
    paddingVertical: 4,
  },
});
