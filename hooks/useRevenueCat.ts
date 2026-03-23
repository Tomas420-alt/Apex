import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const REVENUECAT_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
}) ?? '';

// Must match entitlement identifier in RevenueCat dashboard
const PRO_ENTITLEMENT = 'ApexTune Pro';

let isConfigured = false;

export function useRevenueCat() {
  const [isReady, setIsReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const updateSubscription = useMutation(api.users.updateSubscription);

  const isPro = customerInfo?.entitlements.active[PRO_ENTITLEMENT] !== undefined;

  // Sync RevenueCat state → Convex
  const syncToConvex = useCallback(async (info: CustomerInfo) => {
    const entitlement = info.entitlements.active[PRO_ENTITLEMENT];
    if (entitlement) {
      await updateSubscription({
        subscriptionStatus: 'active',
        subscriptionPlan: entitlement.productIdentifier.includes('yearly') ? 'annual' : 'monthly',
        subscriptionExpiresAt: entitlement.expirationDate
          ? new Date(entitlement.expirationDate).getTime()
          : undefined,
      });
    } else {
      // Check if they had a subscription that expired
      const expired = info.entitlements.all[PRO_ENTITLEMENT];
      if (expired) {
        await updateSubscription({
          subscriptionStatus: 'expired',
          subscriptionPlan: undefined,
          subscriptionExpiresAt: undefined,
        });
      }
    }
  }, [updateSubscription]);

  // Initialize RevenueCat
  useEffect(() => {
    if (isConfigured || !REVENUECAT_API_KEY) return;

    const init = async () => {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        isConfigured = true;

        // Get current customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        // Load available packages
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }

        setIsReady(true);
      } catch (e) {
        console.error('[RevenueCat] Init error:', e);
        setIsReady(true); // Still mark ready so UI isn't stuck
      }
    };

    init();
  }, []);

  // Listen for subscription changes
  useEffect(() => {
    if (!isConfigured) return;

    const remove = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
      // Don't auto-sync to Convex here — only sync on explicit purchase/restore
    });

    return () => {
      if (typeof remove === 'function') {
        remove();
      }
    };
  }, [syncToConvex]);

  // Purchase a package
  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setIsLoading(true);
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      await syncToConvex(info);
      return { success: true };
    } catch (e: any) {
      if (e.userCancelled) {
        return { success: false, cancelled: true };
      }
      console.error('[RevenueCat] Purchase error:', e);
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  }, [syncToConvex]);

  // Restore purchases
  const restore = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      await syncToConvex(info);
      return { success: true, isPro: info.entitlements.active[PRO_ENTITLEMENT] !== undefined };
    } catch (e: any) {
      console.error('[RevenueCat] Restore error:', e);
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  }, [syncToConvex]);

  // Get monthly and annual packages
  const monthlyPackage = packages.find(
    (p) => p.packageType === 'MONTHLY' || p.product.identifier.includes('monthly')
  );
  const annualPackage = packages.find(
    (p) => p.packageType === 'ANNUAL' || p.product.identifier.includes('yearly')
  );

  return {
    isReady,
    isPro,
    isLoading,
    customerInfo,
    packages,
    monthlyPackage,
    annualPackage,
    purchase,
    restore,
  };
}
