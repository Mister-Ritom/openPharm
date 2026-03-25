import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';

export default function OnboardingStep1() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image 
          source={require('../../assets/images/onboarding_1_sugar_1774416332074.png')} 
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.content}>
          <Text style={styles.title}>Sugar. Decoded.</Text>
          <Text style={styles.subtitle}>
            We translate scientific labels into reality. Know exactly how many teaspoons of sugar are in your favorite snacks.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button 
            title="Next" 
            onPress={() => router.push('/(onboarding)/step2')} 
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
  },
});
