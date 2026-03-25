import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../src/theme/designSystem';
import { PostHogProvider } from 'posthog-react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { OnboardingProvider, useOnboarding } from '../src/context/OnboardingContext';
import { configureRevenueCat } from '../src/hooks/useSubscription';

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
  const { hasOnboarded } = useOnboarding();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '7881873473-rbfurd0g39fioii3uuh9unp9tnct8718.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  // Configure RevenueCat whenever the Firebase auth user changes
  useEffect(() => {
    configureRevenueCat(user?.uid);
  }, [user?.uid]);

  useEffect(() => {
    if (initializing || hasOnboarded === null) return;

    const path = segments.join('/');
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // User is logged in
      const needsEmailVerification = user.email && !user.emailVerified;
      const isVerifying = path.includes('verify-email');
      const isSettingUp = path.includes('setup-profile');
      
      if (needsEmailVerification && !isVerifying) {
        router.replace('/(auth)/verify-email');
      } else if (!needsEmailVerification && !profile && !isSettingUp) {
        // Force profile setup if missing
        router.replace('/(auth)/setup-profile');
      } else if (profile && !needsEmailVerification) {
        if (!hasOnboarded && !inOnboardingGroup) {
          router.replace('/(onboarding)/step1');
        } else if (hasOnboarded && (inAuthGroup || inOnboardingGroup || isSettingUp || isVerifying)) {
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
