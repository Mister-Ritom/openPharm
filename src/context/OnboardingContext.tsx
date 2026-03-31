import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingContextType {
  hasOnboarded: boolean | null;
  completeOnboarding: (profile: string) => Promise<void>;
  setHasOnboarded: (val: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [hasOnboarded, _setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      _setHasOnboarded(val === 'true');
    });
  }, []);

  const setHasOnboarded = async (val: boolean) => {
    try {
      await AsyncStorage.setItem('onboarding_complete', val ? 'true' : 'false');
      _setHasOnboarded(val);
    } catch (e) {
      console.error('Error setting onboarding status:', e);
    }
  };

  const completeOnboarding = async (profile: string) => {
    try {
      await AsyncStorage.setItem('health_profile', profile);
      await setHasOnboarded(true);
    } catch (e) {
      console.error('Error completing onboarding:', e);
    }
  };

  return (
    <OnboardingContext.Provider value={{ hasOnboarded, completeOnboarding, setHasOnboarded }}>
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
