import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/theme/designSystem';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function HomeScreen() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('General Focus');
  const [recentScans, setRecentScans] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('health_profile').then(profile => {
      if (profile === 'diabetic') setProfileName('Sugar & Diabetes Watch');
      if (profile === 'pcos') setProfileName('PCOS & Hormones Focus');
      if (profile === 'heart') setProfileName('Heart & Cholesterol Guard');
    });

    const uid = auth().currentUser?.uid;
    if (uid) {
      // Mocked recent scans query
      // firestore().collection('users').doc(uid).collection('history').limit(3).get()
      setRecentScans([]);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, Explorer.</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileText}>{profileName}</Text>
          </View>
        </View>

        {/* Upgrade Banner Mockup */}
        <Card variant="elevated" style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Unlock Unlimited Scans</Text>
          <Text style={styles.upgradeDesc}>You have 2 free scans remaining today. Go Pro to lift all limits and empower your choices.</Text>
          <Button title="Upgrade to Pro" variant="secondary" onPress={() => router.push('/(main)/profile')} />
        </Card>

        {/* Action Area */}
        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Ready to Check?</Text>
          <Text style={styles.sectionDesc}>Uncover the truth behind the label.</Text>
          <Button 
            title="Scan a Barcode" 
            onPress={() => router.push('/(main)/scan')} 
            style={{ marginTop: theme.spacing[4] }}
          />
        </View>

        {/* Recent Scans */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>
          {recentScans.length === 0 ? (
            <Text style={styles.emptyText}>You haven't scanned anything yet. Tap the button above to begin.</Text>
          ) : (
            recentScans.map((scan: any, i: number) => (
              <Card key={i} style={{ marginBottom: theme.spacing[3] }}>
                <Text>Mock Data</Text>
              </Card>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    padding: theme.spacing[6],
    paddingBottom: 100, // padding for bottom tabs
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[6],
  },
  greeting: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  profileBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.rounding.full,
  },
  profileText: {
    color: theme.colors.onPrimaryContainer,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: '700',
  },
  upgradeCard: {
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing[8],
  },
  upgradeTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onPrimary,
    fontWeight: '700',
    marginBottom: theme.spacing[2],
  },
  upgradeDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onPrimary,
    opacity: 0.9,
    marginBottom: theme.spacing[4],
    lineHeight: 22,
  },
  scanSection: {
    marginBottom: theme.spacing[8],
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: theme.spacing[2],
  },
  sectionDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
  },
  recentSection: {
    flex: 1,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
    marginTop: theme.spacing[4],
    lineHeight: 22,
  }
});
