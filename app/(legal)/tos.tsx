import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { theme } from '../../src/theme/designSystem';

export default function TOSScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.date}>Last Updated: October 2026</Text>

      <Text style={styles.heading}>1. Acceptance of Terms</Text>
      <Text style={styles.paragraph}>
        By creating an account and using OpenPharma, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
      </Text>

      <Text style={styles.heading}>2. Medical Disclaimer</Text>
      <Text style={styles.paragraph}>
        OpenPharma provides nutritional interpretation based on public databases (like OpenFoodFacts) and AI analysis (Google Gemini). THIS IS NOT MEDICAL ADVICE. Our health profiles (e.g., 'Diabetic', 'PCOS') are for informational filtering purposes only and should not replace consultation with a qualified healthcare provider.
      </Text>

      <Text style={styles.heading}>3. OpenPharma Pro Subscriptions</Text>
      <Text style={styles.paragraph}>
        Subscriptions are billed on a recurring basis (monthly or annually). Your Apple ID or Google Play account will be charged at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.
      </Text>

      <Text style={styles.heading}>4. Acceptable Use</Text>
      <Text style={styles.paragraph}>
        You agree not to misuse the OCR and Barcode endpoints for automated scraping, reverse engineering, or mass data extraction.
      </Text>

      <Text style={styles.heading}>5. Limitation of Liability</Text>
      <Text style={styles.paragraph}>
        We are not liable for inaccuracies in the retrieved nutritional data or text recognition errors resulting from blurry images.
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
