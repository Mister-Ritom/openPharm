import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { Stack, useRouter, useSegments } from "expo-router";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import MobileAds from "react-native-google-mobile-ads";
import {
  OnboardingProvider,
  useOnboarding,
} from "../src/context/OnboardingContext";
import { useAuth } from "../src/hooks/useAuth";
import {
  configureRevenueCat,
  syncRevenueCatUser,
} from "../src/hooks/useSubscription";
import { theme } from "../src/theme/designSystem";

const posthogConfig = {
  host: "https://pharma.ritom.in",
};

const POSTHOG_API_KEY = "phc_IbZDwVYFWvdPa0GMzQ7BELr04LgfS4lXsMuwlPapaMC";

export default function RootLayout() {
  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={posthogConfig}>
      <OnboardingProvider>
        <LayoutContent />
      </OnboardingProvider>
    </PostHogProvider>
  );
}

function LayoutContent() {
  const { user, profile, initializing } = useAuth();
  const { hasOnboarded, setHasOnboarded } = useOnboarding();
  const posthog = usePostHog();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "7881873473-rbfurd0g39fioii3uuh9unp9tnct8718.apps.googleusercontent.com",
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  useEffect(() => {
    configureRevenueCat();
  }, []);

  // Initialize Google AdMob SDK with health/lifestyle targeting keywords
  useEffect(() => {
    const initAds = async () => {
      try {
        // iOS: Request App Tracking Transparency permission.
        // If denied, AdMob automatically serves non-personalized ads — we never stop ads.
        if (Platform.OS === 'ios') {
          const { status } = await requestTrackingPermissionsAsync();
          console.log('[AdMob] ATT status:', status);
        }

        await MobileAds().initialize();
        await MobileAds().setRequestConfiguration({
          // Targeted health/lifestyle ad categories
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
          maxAdContentRating: 'MA',
        });
        console.log('[AdMob] SDK initialized');
      } catch (e) {
        console.error('[AdMob] Initialization error:', e);
      }
    };

    initAds();
  }, []);

  // Sync RevenueCat and PostHog whenever the Firebase auth user changes
  useEffect(() => {
    if (!initializing) {
      syncRevenueCatUser(user?.uid);

      if (user?.uid) {
        posthog?.identify(user.uid, {
          email: user.email,
          ...profile,
        });
      } else {
        posthog?.reset();
      }
    }
  }, [user?.uid, initializing, profile, posthog]);

  useEffect(() => {
    if (initializing || hasOnboarded === null) return;

    const path = segments.join("/");
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inMainGroup = segments[0] === "(main)";
    const inLegalGroup = segments[0] === "(legal)";
    const isAbout = segments[0] === "about";

    // Wait for the router to fully initialize its path during rebuilds
    if (!segments || (segments.length as any) === 0) return;

    const userHasOnboarded = hasOnboarded || profile?.hasOnboarded;

    // Sync onboarding status from profile to LocalStorage if needed
    if (user && profile?.hasOnboarded && !hasOnboarded) {
      setHasOnboarded(true);
      // Continue execution to handle routing in the same frame if possible
    }

    if (!user) {
      // Visitors
      if (userHasOnboarded) {
        // Already onboarded but not logged in -> Auth
        if (!inAuthGroup && !inLegalGroup && !isAbout) {
          router.replace("/(auth)/login");
        }
      } else {
        // Not onboarded -> Onboarding
        if (!inOnboardingGroup && !inAuthGroup && !inLegalGroup && !isAbout) {
          router.replace("/(onboarding)/step1");
        }
      }
    } else {
      // User is logged in
      const needsEmailVerification = user.email && !user.emailVerified;
      const isVerifying = path.includes("verify-email");
      const isSettingUp = path.includes("setup-profile");

      if (needsEmailVerification && !isVerifying) {
        router.replace("/(auth)/verify-email");
      } else if (!needsEmailVerification && !profile && !isSettingUp) {
        // Force profile setup if missing
        router.replace("/(auth)/setup-profile");
      } else if (profile && !needsEmailVerification) {
        const isProfileComplete =
          !!profile.displayName &&
          !!profile.healthProfiles &&
          !!profile.ageRange;

        if (!isProfileComplete) {
          if (!isSettingUp) {
            router.replace("/(auth)/setup-profile");
          }
        } else if (
          isProfileComplete &&
          (inAuthGroup || inOnboardingGroup || isSettingUp || isVerifying)
        ) {
          if (!inMainGroup && !inLegalGroup) {
            router.replace("/(main)");
          }
        }
      }
    }
  }, [
    user,
    profile,
    initializing,
    hasOnboarded,
    segments,
    setHasOnboarded,
    router,
  ]);

  if (initializing || hasOnboarded === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.surface,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: theme.typography.fontFamily.headline,
          fontWeight: "700",
        },
        // @ts-ignore - headerBackButtonDisplayMode hides the back title in modern native-stack versions
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="(main)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(legal)/privacy"
        options={{
          headerTitle: "Privacy Policy",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="(legal)/tos"
        options={{
          headerTitle: "Terms of Service",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="about/index"
        options={{
          headerTitle: "About OpenPharma",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="paywall/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
