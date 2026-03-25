import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingContextType {
  hasOnboarded: boolean | null;
  completeOnboarding: (profile: string) => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, []);

  const completeOnboarding = async (profile: string) => {
    await AsyncStorage.setItem('health_profile', profile);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    setHasOnboarded(true);
  };

  return (
    <OnboardingContext.Provider value={{ hasOnboarded, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
