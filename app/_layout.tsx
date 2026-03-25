import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../src/theme/designSystem';
import { PostHogProvider } from 'posthog-react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { OnboardingProvider, useOnboarding } from '../src/context/OnboardingContext';
import { configureRevenueCat, syncRevenueCatUser } from '../src/hooks/useSubscription';

const posthogConfig = {
  host: 'https://pharma.ritom.in',
};

const POSTHOG_API_KEY = 'phc_IbZDwVYFWvdPa0GMzQ7BELr04LgfS4lXsMuwlPapaMC';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <LayoutContent />
    </OnboardingProvider>
  );
}

function LayoutContent() {
  const { user, profile, initializing } = useAuth();
  const { hasOnboarded, setHasOnboarded } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '7881873473-rbfurd0g39fioii3uuh9unp9tnct8718.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  useEffect(() => {
    configureRevenueCat();
  }, []);

  // Sync RevenueCat whenever the Firebase auth user changes
  useEffect(() => {
    if (!initializing) {
      syncRevenueCatUser(user?.uid);
    }
  }, [user?.uid, initializing]);

  useEffect(() => {
    if (initializing || hasOnboarded === null) return;

    const path = segments.join('/');
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    // Sync onboarding status from profile to LocalStorage if needed
    if (user && profile?.hasOnboarded && !hasOnboarded) {
      setHasOnboarded(true);
      return; // Re-run effect with updated state
    }

    if (!user) {
      // Visitors: Onboarding is the landing page
      if (!inOnboardingGroup && !inAuthGroup) {
        router.replace('/(onboarding)/step1');
      }
    } else {
      // User is logged in
      const needsEmailVerification = user.email && !user.emailVerified;
      const isVerifying = path.includes('verify-email');
      const isSettingUp = path.includes('setup-profile');
      
      const userHasOnboarded = hasOnboarded || profile?.hasOnboarded;

      if (needsEmailVerification && !isVerifying) {
        router.replace('/(auth)/verify-email');
      } else if (!needsEmailVerification && !profile && !isSettingUp) {
        // Force profile setup if missing
        router.replace('/(auth)/setup-profile');
      } else if (profile && !needsEmailVerification) {
        const isProfileComplete = !!profile.displayName && !!profile.healthProfiles && !!profile.ageRange;
        
        if (!isProfileComplete) {
          if (!isSettingUp) {
            router.replace('/(auth)/setup-profile');
          }
        } else if (isProfileComplete && (inAuthGroup || inOnboardingGroup || isSettingUp || isVerifying)) {
          router.replace('/(main)');
        }
      }
    }
  }, [user, profile, initializing, hasOnboarded, segments]);

  if (initializing || hasOnboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={posthogConfig}>
      <Stack screenOptions={{ headerShown: false }} />
    </PostHogProvider>
  );
}
