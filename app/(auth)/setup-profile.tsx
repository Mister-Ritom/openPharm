import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import { useAnalytics } from '../../src/utils/useAnalytics';

const HEALTH_PROFILES = [
  { id: 'general', label: 'General', icon: '🍏' },
  { id: 'diabetic', label: 'Diabetic', icon: '🩺' },
  { id: 'pcos', label: 'PCOS', icon: '🌸' },
  { id: 'heart', label: 'Heart Patient', icon: '❤️' },
  { id: 'child', label: 'Child', icon: '👶' },
  { id: 'pregnant', label: 'Pregnant', icon: '🤰' },
];

const AGE_RANGES = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+'];

export default function SetupProfileScreen() {
  const [displayName, setDisplayName] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [ageRange, setAgeRange] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const analytics = useAnalytics();
  const user = auth().currentUser;

  const toggleProfile = (id: string) => {
    if (selectedProfiles.includes(id)) {
      setSelectedProfiles(selectedProfiles.filter(p => p !== id));
    } else {
      setSelectedProfiles([...selectedProfiles, id]);
    }
  };

  const handleSave = async () => {
    if (!displayName || selectedProfiles.length === 0 || !ageRange) {
      return Alert.alert('Missing Info', 'Please fill in all fields to personalize your experience.');
    }

    setLoading(true);
    try {
      const profileData = {
        displayName,
        healthProfiles: selectedProfiles,
        ageRange,
        notifications,
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActiveAt: firestore.FieldValue.serverTimestamp(),
        uid: user?.uid,
      };

      await firestore().collection('users').doc(user?.uid).set(profileData);
      
      analytics.trackEvent('health_profile_set', { 
        profiles_selected: selectedProfiles, 
        age_range: ageRange 
      });

      // The RootLayout will now pick up the profile and direct to Home or Onboarding
      router.replace('/(main)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Let's personalize your experience.</Text>
          <Text style={styles.subtitle}>Our ratings change based on your health profile.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={theme.colors.outline}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Select your health profiles (select all that apply)</Text>
          <View style={styles.profileGrid}>
            {HEALTH_PROFILES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.profileCard,
                  selectedProfiles.includes(p.id) && styles.profileCardSelected
                ]}
                onPress={() => toggleProfile(p.id)}
              >
                <Text style={styles.profileIcon}>{p.icon}</Text>
                <Text style={[
                  styles.profileLabel,
                  selectedProfiles.includes(p.id) && styles.profileLabelSelected
                ]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Your age range</Text>
          <View style={styles.ageGrid}>
            {AGE_RANGES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.ageChip,
                  ageRange === r && styles.ageChipSelected
                ]}
                onPress={() => setAgeRange(r)}
              >
                <Text style={[
                  styles.ageText,
                  ageRange === r && styles.ageTextSelected
                ]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setNotifications(!notifications)}
          >
            <View style={[styles.checkbox, notifications && styles.checkboxActive]} />
            <Text style={styles.checkboxLabel}>Notify me of harmful products I scan</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Save & Continue"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    padding: theme.spacing[6],
  },
  header: {
    marginBottom: theme.spacing[8],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  section: {
    marginBottom: theme.spacing[8],
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing[4],
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounding.lg,
    padding: theme.spacing[4],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  profileCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.rounding.xl,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileCardSelected: {
    backgroundColor: theme.colors.primaryContainer,
    borderColor: theme.colors.primary,
  },
  profileIcon: {
    fontSize: 32,
    marginBottom: theme.spacing[1],
  },
  profileLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
  },
  profileLabelSelected: {
    color: theme.colors.onPrimaryContainer,
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  ageChip: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.rounding.full,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  ageChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  ageText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  ageTextSelected: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
  },
  checkboxLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
  },
  saveButton: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
});
