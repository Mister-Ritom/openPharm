import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../src/theme/designSystem';
import { PostHogProvider } from 'posthog-react-native';

const posthogConfig = {
  host: 'https://eu.i.posthog.com',
};

const POSTHOG_API_KEY = 'phc_IbZDwVYFWvdPa0GMzQ7BELr04LgfS4lXsMuwlPapaMC';

export default function RootLayout() {
  const { user, profile, initializing } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, []);

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
