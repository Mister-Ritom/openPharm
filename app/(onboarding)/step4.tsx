import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import { useAnalytics } from '../../src/utils/useAnalytics';
import { useOnboarding } from '../../src/context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';

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
  const { completeOnboarding } = useOnboarding();
  const [selectedProfile, setSelectedProfile] = useState<string>('general');

  const handleFinish = async () => {
    try {
      await completeOnboarding(selectedProfile);
      
      const auth = getAuth(getApp());
      const user = auth.currentUser;
      const db = getFirestore(getApp());

      if (user) {
        // Sync to firestore if user is logged in
        await updateDoc(doc(db, 'users', user.uid), {
          hasOnboarded: true,
          primaryGoal: selectedProfile,
          lastActiveAt: serverTimestamp()
        });
      }
      
      analytics.trackEvent('onboarding_completed', { profile: selectedProfile });
    } catch (e) {
      console.error('Error finishing onboarding:', e);
    }
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
              <View style={styles.cardContent}>
                <Text style={[
                  styles.cardText,
                  selectedProfile === prof.id && styles.cardTextActive
                ]}>
                  {prof.label}
                </Text>
                {selectedProfile === prof.id && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                )}
              </View>
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
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
