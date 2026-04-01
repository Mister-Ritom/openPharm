import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { theme } from '../../src/theme/designSystem';

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.date}>Last Updated: October 2026</Text>

      <Text style={styles.heading}>1. Introduction</Text>
      <Text style={styles.paragraph}>
        OpenPharma (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how your personal data is collected, used, and processed when you use our mobile application and services, in compliance with GDPR (EU/UK), CCPA (US), and the DPDP Act 2023 (India).
      </Text>

      <Text style={styles.heading}>2. Information We Collect</Text>
      <Text style={styles.paragraph}>
        We collect account information (email address), crash logs and analytics (via PostHog), and purchase history (via RevenueCat). We DO NOT collect personal biological information or attach scanned barcode history to your individual identity for advertising. Barcode scans are anonymized.
      </Text>

      <Text style={styles.heading}>3. How We Use Your Data</Text>
      <Text style={styles.paragraph}>
        Your data is used solely to provide the OpenPharma core features (e.g., maintaining your custom health profile to flag ingredients appropriately), process subscriptions, and improve app stability.
      </Text>

      <Text style={styles.heading}>4. Data Sharing & Third Parties</Text>
      <Text style={styles.paragraph}>
        We use Firebase (Authentication), RevenueCat (Subscriptions), and PostHog (Analytics). We do not sell your personal data to any data brokers.
      </Text>

      <Text style={styles.heading}>5. User Rights</Text>
      <Text style={styles.paragraph}>
        Depending on your region, you have the right to access, correct, or delete your personal data. You may delete your account directly inside the app, which automatically purges your data from our active Google Cloud databases.
      </Text>
      
      <Text style={styles.heading}>6. Contact Us</Text>
      <Text style={styles.paragraph}>
        For privacy inquiries, please email ritomghosh856@gmail.com.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing[6],
    backgroundColor: theme.colors.surface,
    paddingBottom: 60,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginBottom: theme.spacing[1],
  },
  date: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginBottom: theme.spacing[6],
  },
  heading: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  paragraph: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 24,
  }
});
