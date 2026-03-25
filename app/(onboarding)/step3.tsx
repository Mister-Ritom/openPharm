import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';

export default function OnboardingStep3() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image 
          // Reusing the hero illustration for the trial/confidence screen
          source={require('../../assets/images/paywall_hero.png')} 
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.content}>
          <Text style={styles.title}>Data You Can Trust.</Text>
          <Text style={styles.subtitle}>
            Independent, objective, and ad-free. Our clinical AI scans millions of ingredients. No greenwashing.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button 
            title="Continue" 
            onPress={() => router.push('/(onboarding)/step4')} 
          />
          <Button 
            title="Back" 
            variant="tertiary"
            onPress={() => router.back()} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    padding: theme.spacing[6],
    justifyContent: 'space-between',
  },
  image: {
    width: '100%',
    height: 300,
    marginTop: theme.spacing[8],
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displayMd,
    color: theme.colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 28,
  },
  footer: {
    marginBottom: theme.spacing[4],
    gap: theme.spacing[2],
  },
});
