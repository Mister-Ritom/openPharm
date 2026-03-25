import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { theme } from '../src/theme/designSystem';
import { Button } from '../src/components/ui/Button';
import { useAnalytics } from '../src/utils/useAnalytics';

export default function PaywallScreen() {
  const router = useRouter();
  const analytics = useAnalytics();
  const [loading, setLoading] = useState(false);

  const purchasePackage = async (packageIdentifier: string) => {
    setLoading(true);
    try {
      // In a real implementation you'd fetch offerings via Purchases.getOfferings() then pass the package object.
      // Here we mock the behavior per RevenueCat MCP constraints.
      // const offerings = await Purchases.getOfferings();
      // await Purchases.purchasePackage(offerings.current.availablePackages[0]);
      
      analytics.trackEvent('subscription_started', { package: packageIdentifier });
      Alert.alert('Success', 'Welcome to OpenPharma Pro!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} bounces={false}>
      <Image 
        source={require('../assets/images/paywall_hero_1774416445423.png')} 
        style={styles.hero}
        resizeMode="cover"
      />
      <View style={styles.closeBtn}>
        <Button variant="tertiary" title="Close" onPress={() => router.back()} textStyle={{ color: '#fff' }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Unlock OpenPharma Pro</Text>
        <Text style={styles.subtitle}>
          Remove limits, support independent clinical data, and personalize everything.
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureItem}>✅ Unlimited Barcode Scans</Text>
          <Text style={styles.featureItem}>✅ Unlimited OCR Label Parsing</Text>
          <Text style={styles.featureItem}>✅ Multiple Custom Health Profiles</Text>
          <Text style={styles.featureItem}>✅ No Ads. No Bullshit.</Text>
        </View>

        <View style={styles.packages}>
          <Button 
            title="Monthly - $2.99/mo" 
            variant="secondary"
            loading={loading}
            onPress={() => purchasePackage('$rc_monthly')} 
            style={styles.btn}
          />
          <Button 
            title="Annual - $19.99/yr" 
            variant="primary"
            loading={loading}
            onPress={() => purchasePackage('$rc_annual')} 
            style={styles.btn}
          />
        </View>

        <View style={styles.legal}>
          <Text style={styles.legalText}>
            Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
          </Text>
          <View style={styles.legalLinks}>
            <Button variant="tertiary" title="Terms" onPress={() => router.push('/(legal)/tos')} textStyle={styles.linkText} />
            <Button variant="tertiary" title="Privacy" onPress={() => router.push('/(legal)/privacy')} textStyle={styles.linkText} />
            <Button variant="tertiary" title="Restore Purchases" onPress={() => {}} textStyle={styles.linkText} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
  },
  hero: {
    width: '100%',
    height: 350,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: theme.spacing[6],
    marginTop: -24,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 26,
    marginBottom: theme.spacing[6],
  },
  features: {
    gap: theme.spacing[3],
    marginBottom: theme.spacing[8],
  },
  featureItem: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  packages: {
    gap: theme.spacing[3],
  },
  btn: {
    paddingVertical: 18,
  },
  legal: {
    marginTop: theme.spacing[8],
  },
  legalText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.outline,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing[2],
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.outline,
  }
});
