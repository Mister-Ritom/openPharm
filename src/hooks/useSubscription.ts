import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Alert, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage
} from 'react-native-purchases';
import { useAuth } from './useAuth';

const RC_ANDROID_KEY = 'goog_EyLMzhvFpCtnzYCtafNykCisjoJ';
const RC_IOS_KEY     = 'appl_zCEpFDZWyrdyjCJJgXUQhvNLKFd';
const RC_TEST_KEY    = 'test_zbZVlVrccWXkAUjOukCKqRqDNwI';
const ENTITLEMENT_ID = 'OpenPharma Pro';

export async function configureRevenueCat() {
  if (Platform.OS === 'web') return;

  // Use Test Store key in development to support mocked billing in expo start
  // Use platform-specific keys only in production/signed builds
  const apiKey = __DEV__ ? RC_TEST_KEY : (Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY);
    
  console.log('[RevenueCat] Configuring with key:', apiKey.substring(0, 8) + '...');
  Purchases.configure({ apiKey }); 
}

export async function syncRevenueCatUser(userId?: string) {
  if (Platform.OS === 'web') return;
  
  if (userId) {
    console.log('[RevenueCat] Logging in user:', userId);
    await Purchases.logIn(userId);
  } else if (!await Purchases.isAnonymous()) {
    console.log('[RevenueCat] Logging out user (anonymous)');
    // Only log out if we're not already anonymous to avoid the error
    await Purchases.logOut();
  }
}

// ---------------------------------------------------------------------------

interface SubscriptionState {
  isPro: boolean;
  loading: boolean;
  offerings: PurchasesOffering | null;
  lowestPrice: string | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  grantMockPro: () => Promise<void>;
  revokeMockPro: () => Promise<void>;
  isDevPro: boolean;
}

export function useSubscription(): SubscriptionState {
  const { user, initializing: authInitializing } = useAuth();
  const [isRcPro, setIsRcPro]     = useState(false);
  const [devOverride, setDevOverride] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (__DEV__) {
      AsyncStorage.getItem('debug_pro_override').then(val => {
        if (val === 'true') setDevOverride(true);
      });
    }
  }, []);

  const checkStatus = useCallback(async (info?: CustomerInfo) => {
    try {
      const customerInfo = info ?? (await Purchases.getCustomerInfo());
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      
      console.log('[RevenueCat] Active Entitlements Keys:', activeEntitlements);
      if (activeEntitlements.length > 0) {
        console.log('[RevenueCat] Full CustomerInfo Entitlements:', JSON.stringify(customerInfo.entitlements.active, null, 2));
      }

      const hasPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      setIsRcPro(hasPro);
    } catch (e) {
      console.error('[RevenueCat] checkStatus error:', e);
      setIsRcPro(false);
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
      
      const hasPro = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (hasPro) {
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

  const grantMockPro = async () => {
    if (__DEV__) {
      await AsyncStorage.setItem('debug_pro_override', 'true');
      setDevOverride(true);
      Alert.alert('Unlocked (Dev)', 'Mock Pro has been enabled natively on your device.');
    }
  };

  const revokeMockPro = async () => {
    if (__DEV__) {
      await AsyncStorage.removeItem('debug_pro_override');
      setDevOverride(false);
      Alert.alert('Restored (Dev)', 'Mock Pro has been removed. You are now back to the Free plan.');
    }
  };

  const isPro = isRcPro || devOverride;
  const isDevPro = devOverride;

  // Find the lowest price package in the current offering
  const lowestPrice: string | null = useMemo(() => {
    if (!offerings?.availablePackages?.length) return null;
    try {
      const sorted = [...offerings.availablePackages].sort(
        (a, b) =>
          (a.product.price ?? Infinity) - (b.product.price ?? Infinity)
      );
      return sorted[0]?.product.priceString ?? null;
    } catch (e) {
      console.error('[RevenueCat] lowestPrice calc error:', e);
      return null;
    }
  }, [offerings]);

  return { 
    isPro, 
    isDevPro,
    loading, 
    offerings, 
    lowestPrice, 
    purchasePackage, 
    restorePurchases, 
    grantMockPro,
    revokeMockPro
  };
}

