import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

const RC_ANDROID_KEY = 'goog_EyLMzhvFpCtnzYCtafNykCisjoJ';
const RC_IOS_KEY     = 'appl_zCEpFDZWyrdyjCJJgXUQhvNLKFd';
const RC_TEST_KEY    = 'test_zbZVlVrccWXkAUjOukCKqRqDNwI';
const ENTITLEMENT_ID = 'OpenPharma Pro';

export function configureRevenueCat(userId?: string) {
  if (Platform.OS === 'web') return;

  // Use Test Store key in Dev for easy testing without real store IDs
  // Use platform-specific keys in Production for real store integration
  const apiKey = __DEV__ 
    ? RC_TEST_KEY 
    : (Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY);
    
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey, appUserID: userId ?? null });
}

// ---------------------------------------------------------------------------

interface SubscriptionState {
  isPro: boolean;
  loading: boolean;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [isPro, setIsPro]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  const checkStatus = useCallback(async (info?: CustomerInfo) => {
    try {
      const customerInfo = info ?? (await Purchases.getCustomerInfo());
      setIsPro(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);
    } catch {
      setIsPro(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const [allOfferings] = await Promise.all([
          Purchases.getOfferings(),
          checkStatus(),
        ]);
        if (mounted) setOfferings(allOfferings.current);
      } catch (e) {
        console.warn('[RevenueCat] useSubscription init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const onCustomerInfoUpdate = (info: CustomerInfo) => { checkStatus(info); };
    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdate);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdate);
    };
  }, [checkStatus]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      await checkStatus(customerInfo);
      return true;
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', e.message ?? 'Something went wrong. Please try again.');
      }
      return false;
    }
  }, [checkStatus]);

  const restorePurchases = useCallback(async () => {
    try {
      setLoading(true);
      const customerInfo = await Purchases.restorePurchases();
      await checkStatus(customerInfo);
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore Failed', e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [checkStatus]);

  return { isPro, loading, offerings, purchasePackage, restorePurchases };
}
