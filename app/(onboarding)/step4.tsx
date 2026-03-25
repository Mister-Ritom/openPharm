import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import { useAnalytics } from '../../src/utils/useAnalytics';

const PROFILES = [
  { id: 'general', label: 'General Health' },
  { id: 'diabetic', label: 'Diabetic / Sugar Watch' },
  { id: 'pcos', label: 'PCOS / Hormonal' },
  { id: 'heart', label: 'Heart & Cholesterol' },
  { id: 'child', label: 'Child Safe' },
  { id: 'pregnant', label: 'Pregnancy Safe' },
];

export default function OnboardingStep4() {
  const router = useRouter();
  const analytics = useAnalytics();
  const [selectedProfile, setSelectedProfile] = useState<string>('general');

  const handleFinish = async () => {
    await AsyncStorage.setItem('health_profile', selectedProfile);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    
    analytics.trackEvent('onboarding_completed', { profile: selectedProfile });
    
    // Auth guard in _layout will redirect properly
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Primary Goal</Text>
          <Text style={styles.subtitle}>
            Select a profile to customize what we flag first on ingredient lists. You can change this later.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {PROFILES.map((prof) => (
            <TouchableOpacity
              key={prof.id}
              style={[
                styles.card,
                selectedProfile === prof.id && styles.cardActive
              ]}
              onPress={() => setSelectedProfile(prof.id)}
            >
              <Text style={[
                styles.cardText,
                selectedProfile === prof.id && styles.cardTextActive
              ]}>
                {prof.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Button 
            title="Get Started" 
            onPress={handleFinish} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  container: {
    flex: 1,
    padding: theme.spacing[6],
  },
  header: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displayMd,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 28,
  },
  list: {
    gap: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  card: {
    padding: theme.spacing[5],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.rounding.lg,
  },
  cardActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  cardText: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  cardTextActive: {
    color: theme.colors.onPrimaryContainer,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: theme.spacing[4],
  },
});
