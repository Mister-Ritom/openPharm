import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Linking } from 'react-native';
import { theme } from '../../src/theme/designSystem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
            <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logo}
                resizeMode="contain"
            />
            <Text style={styles.title}>OpenPharma</Text>
            <Text style={styles.tagline}>Transparency in every bite.</Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.body}>
                OpenPharma empowers you with independent, objective, and ad-free clinical data about the products you consume every day. We believe you have the right to know exactly what's inside your food and medicine.
            </Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clean Label</Text>
            <Text style={styles.body}>
                Our AI-powered clinical scans detect harmful additives, hidden allergens, and misleading marketing. We help you cut through the "greenwashing" to find products that are genuinely good for you.
            </Text>
        </View>

        <View style={styles.footer}>
            <Text style={styles.version}>Version 1.0.0</Text>
            <Text style={styles.copyright}>© 2026 OpenPharma Project</Text>
            <Button 
                title="Back to App" 
                onPress={() => router.back()} 
                style={styles.backButton}
            />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scroll: {
    padding: theme.spacing[6],
    paddingTop: theme.spacing[8],
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: theme.rounding.default,
    marginBottom: theme.spacing[4],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  tagline: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.8,
  },
  section: {
    marginBottom: theme.spacing[8],
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: theme.spacing[3],
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 24,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: theme.spacing[8],
  },
  version: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginBottom: theme.spacing[1],
  },
  copyright: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginBottom: theme.spacing[6],
  },
  backButton: {
    width: '100%',
  }
});
