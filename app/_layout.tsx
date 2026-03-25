import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../src/theme/designSystem';
import { PostHogProvider } from 'posthog-react-native';

const posthogConfig = {
  host: 'https://app.posthog.com',
};

export default function RootLayout() {
  const { user, initializing } = useAuth();
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

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user) {
      if (!hasOnboarded && !inOnboardingGroup) {
        router.replace('/(onboarding)/step1');
      } else if (hasOnboarded && (inAuthGroup || inOnboardingGroup)) {
        router.replace('/(main)');
      }
    }
  }, [user, initializing, hasOnboarded, segments]);

  if (initializing || hasOnboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <PostHogProvider apiKey="phc_dummy_key_for_openpharm" options={posthogConfig}>
      <Stack screenOptions={{ headerShown: false }} />
    </PostHogProvider>
  );
}
