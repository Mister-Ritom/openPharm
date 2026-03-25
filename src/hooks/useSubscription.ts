import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
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

export async function configureRevenueCat() {
  if (Platform.OS === 'web') return;

  const apiKey = __DEV__ 
    ? RC_TEST_KEY 
    : (Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY);
    
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey }); // Initialize without ID initially
}

export async function syncRevenueCatUser(userId?: string) {
  if (Platform.OS === 'web') return;
  
  if (userId) {
    await Purchases.logIn(userId);
  } else if (!await Purchases.isAnonymous()) {
    // Only log out if we're not already anonymous to avoid the error
    await Purchases.logOut();
  }
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
  const { user, initializing: authInitializing } = useAuth();
  const [isPro, setIsPro]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const isSyncing = useRef(false);

  const checkStatus = useCallback(async (info?: CustomerInfo) => {
    try {
      const customerInfo = info ?? (await Purchases.getCustomerInfo());
      setIsPro(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);
    } catch {
      setIsPro(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || authInitializing) {
      if (Platform.OS === 'web') setLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      // Small delay to allow RootLayout's syncRevenueCatUser to finish if it just triggered
      if (isSyncing.current) return;
      isSyncing.current = true;

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
        isSyncing.current = false;
      }
    };

    init();

    const onCustomerInfoUpdate = (info: CustomerInfo) => { checkStatus(info); };
    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdate);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdate);
    };
  }, [checkStatus, user?.uid, authInitializing]);

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
