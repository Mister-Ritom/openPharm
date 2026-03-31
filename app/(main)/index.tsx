import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../src/theme/designSystem';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useSubscription } from '../../src/hooks/useSubscription';
import { useScanCount } from '../../src/hooks/useScanCount';
import { CONFIG } from '../../src/constants/Config';

export default function HomeScreen() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('General Focus');
  const { isPro } = useSubscription();
  const { count, loading: loadingCount } = useScanCount();

  useEffect(() => {
    AsyncStorage.getItem('health_profile').then(profile => {
      if (profile === 'diabetic') setProfileName('Sugar & Diabetes Watch');
      if (profile === 'pcos')     setProfileName('PCOS & Hormones Focus');
      if (profile === 'heart')    setProfileName('Heart & Cholesterol Guard');
    });
  }, []);

  const remainingScans = Math.max(0, CONFIG.FREE_SCAN_LIMIT - count);

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Greeting Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, Explorer.</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileText}>{profileName}</Text>
          </View>
        </View>

        {/* Upgrade Banner — only shown for free users */}
        {!isPro && (
          <Card variant="elevated" style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>Unlock Unlimited Scans</Text>
            <Text style={styles.upgradeDesc}>
              {loadingCount ? 'Checking scan limit...' : 
               `You have ${remainingScans} free scan${remainingScans === 1 ? '' : 's'} remaining today. Go Pro to lift all limits and empower your choices.`}
            </Text>
            <Button
              title="Upgrade to Pro"
              variant="secondary"
              onPress={() => router.push('/paywall')}
            />
          </Card>
        )}

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

        {/* Home screen usually has a condensed history view below */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>
          <Text style={styles.emptyText}>
            Head to the History tab to see your full exploration list and deep clinical insights.
          </Text>
          <Button 
            title="View Full History" 
            variant="tertiary" 
            onPress={() => router.push('/(main)/history')} 
            style={{ marginTop: theme.spacing[2] }}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: theme.colors.surface },
  container: { padding: theme.spacing[6], paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[6],
  },
  greeting: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize:   theme.typography.sizes.displaySm,
    color:      theme.colors.onSurface,
    fontWeight: '800',
  },
  profileBadge: {
    backgroundColor:  theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   theme.spacing[2],
    borderRadius:      theme.rounding.full,
  },
  profileText: {
    color:      theme.colors.onPrimaryContainer,
    fontFamily: theme.typography.fontFamily.body,
    fontSize:   theme.typography.sizes.bodySm,
    fontWeight: '700',
  },
  upgradeCard:  { backgroundColor: theme.colors.primary, marginBottom: theme.spacing[8] },
  upgradeTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize:   theme.typography.sizes.headlineSm,
    color:      theme.colors.onPrimary,
    fontWeight: '700',
    marginBottom: theme.spacing[2],
  },
  upgradeDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize:   theme.typography.sizes.bodyMd,
    color:      theme.colors.onPrimary,
    opacity:    0.9,
    marginBottom: theme.spacing[4],
    lineHeight:   22,
  },
  scanSection:   { marginBottom: theme.spacing[8] },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize:   theme.typography.sizes.headlineSm,
    color:      theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: theme.spacing[2],
  },
  sectionDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize:   theme.typography.sizes.bodyMd,
    color:      theme.colors.outline,
  },
  recentSection: { flex: 1 },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize:   theme.typography.sizes.bodyMd,
    color:      theme.colors.outline,
    marginTop:  theme.spacing[4],
    lineHeight: 22,
  },
});
