import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { theme } from '../src/theme/designSystem';
import { Button } from '../src/components/ui/Button';
import { useSubscription } from '../src/hooks/useSubscription';
import { useAnalytics } from '../src/utils/useAnalytics';

const PLAN_META: Record<string, { label: string; badge?: string; highlight: boolean }> = {
  '$rc_monthly':   { label: 'Monthly',   highlight: false },
  '$rc_six_month': { label: '6 Months',  badge: 'Save 30%', highlight: false },
  '$rc_annual':    { label: 'Yearly',    badge: 'Best Value 🔥', highlight: true },
};

export default function PaywallScreen() {
  const router   = useRouter();
  const analytics = useAnalytics();
  const { offerings, purchasePackage, restorePurchases, isPro, loading } = useSubscription();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const packages: PurchasesPackage[] = offerings?.availablePackages ?? [];

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(pkg.identifier);
    analytics.trackEvent('subscription_started', { package: pkg.identifier });
    const success = await purchasePackage(pkg);
    setPurchasing(null);
    if (success) router.back();
  };

  // Already pro — just close the paywall
  if (!loading && isPro) {
    return (
      <View style={styles.proCentered}>
        <Text style={styles.proEmoji}>✅</Text>
        <Text style={styles.proTitle}>You're already Pro!</Text>
        <Button title="Close" variant="secondary" onPress={() => router.back()} style={{ marginTop: theme.spacing[6] }} />
      </View>
    );
  }

  // Web fallback — native billing not available
  if (Platform.OS === 'web') {
    return (
      <View style={styles.proCentered}>
        <Text style={styles.proEmoji}>🌐</Text>
        <Text style={styles.proTitle}>Subscribe on Mobile</Text>
        <Text style={[styles.proSub, { textAlign: 'center', marginTop: theme.spacing[3] }]}>
          In-app purchases are only available in our iOS or Android apps.
        </Text>
        <Button title="Close" variant="secondary" onPress={() => router.back()} style={{ marginTop: theme.spacing[6] }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} bounces={false}>
      <Image
        source={require('../assets/images/paywall_hero.png')}
        style={styles.hero}
        resizeMode="cover"
      />
      <View style={styles.closeBtn}>
        <Button variant="tertiary" title="✕" onPress={() => router.back()} textStyle={{ color: '#fff', fontSize: 18 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Unlock OpenPharma Pro</Text>
        <Text style={styles.subtitle}>
          Remove limits, support independent clinical data, and personalize everything.
        </Text>

        <View style={styles.features}>
          {[
            '✅  Unlimited Barcode Scans',
            '✅  Unlimited OCR Label Parsing',
            '✅  Multiple Custom Health Profiles',
            '✅  No Ads. No Bullshit.',
          ].map(f => (
            <Text key={f} style={styles.featureItem}>{f}</Text>
          ))}
        </View>

        {/* Plan Cards */}
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginVertical: theme.spacing[8] }} />
        ) : packages.length === 0 ? (
          <Text style={styles.noPlansText}>Plans unavailable. Please try again later.</Text>
        ) : (
          <View style={styles.packages}>
            {packages
              .sort((a, b) => {
                const order = ['$rc_monthly', '$rc_six_month', '$rc_annual'];
                return order.indexOf(a.identifier) - order.indexOf(b.identifier);
              })
              .map((pkg) => {
                const meta = PLAN_META[pkg.identifier] ?? { label: pkg.packageType, highlight: false };
                const isBuying = purchasing === pkg.identifier;

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.planCard, meta.highlight && styles.planCardHighlight]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={!!purchasing}
                    activeOpacity={0.85}
                  >
                    {meta.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{meta.badge}</Text>
                      </View>
                    )}
                    <View style={styles.planRow}>
                      <View>
                        <Text style={[styles.planLabel, meta.highlight && styles.planLabelHighlight]}>
                          {meta.label}
                        </Text>
                        <Text style={[styles.planSub, meta.highlight && styles.planSubHighlight]}>
                          {pkg.product.description || pkg.product.title}
                        </Text>
                      </View>
                      {isBuying ? (
                        <ActivityIndicator color={meta.highlight ? '#fff' : theme.colors.primary} />
                      ) : (
                        <Text style={[styles.planPrice, meta.highlight && styles.planPriceHighlight]}>
                          {pkg.product.priceString}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        <View style={styles.legal}>
          <Text style={styles.legalText}>
            Subscriptions auto-renew unless canceled at least 24 hours before the current period ends.
          </Text>
          <View style={styles.legalLinks}>
            <Button variant="tertiary" title="Terms"   onPress={() => router.push('/tos')}     textStyle={styles.linkText} />
            <Button variant="tertiary" title="Privacy" onPress={() => router.push('/privacy')} textStyle={styles.linkText} />
            <Button
              variant="tertiary"
              title="Restore Purchases"
              onPress={restorePurchases}
              textStyle={styles.linkText}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: theme.colors.surface },
  hero:      { width: '100%', height: 300 },
  closeBtn: {
    position: 'absolute', top: 50, right: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, overflow: 'hidden',
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
  features:    { gap: theme.spacing[3], marginBottom: theme.spacing[8] },
  featureItem: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  packages:     { gap: theme.spacing[3] },
  noPlansText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
    textAlign: 'center',
    marginVertical: theme.spacing[8],
  },

  // Plan card
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: theme.spacing[5],
    overflow: 'hidden',
  },
  planCardHighlight: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  planRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planLabel: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
  },
  planLabelHighlight: { color: '#fff' },
  planSub: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginTop: 2,
  },
  planSubHighlight: { color: 'rgba(255,255,255,0.75)' },
  planPrice: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  planPriceHighlight: { color: '#fff' },

  // Badge
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.rounding.full,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 3,
    marginBottom: theme.spacing[3],
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },

  // Legal
  legal:      { marginTop: theme.spacing[8] },
  legalText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.outline,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing[2] },
  linkText:   { fontSize: 12, color: theme.colors.outline },

  // Pro / web fallback
  proCentered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing[8], backgroundColor: theme.colors.surface },
  proEmoji:    { fontSize: 56, marginBottom: theme.spacing[4] },
  proTitle:    { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineMd, color: theme.colors.onSurface, fontWeight: '800' },
  proSub:      { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant },
});
