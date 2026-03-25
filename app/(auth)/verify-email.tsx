import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const user = auth().currentUser;

  const handleResend = async () => {
    setLoading(true);
    try {
      await user?.sendEmailVerification();
      Alert.alert('Sent', 'Verification email has been resent to ' + user?.email);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      await user?.reload();
      if (auth().currentUser?.emailVerified) {
        // RootLayout will handle the redirect
        Alert.alert('Success', 'Your email is verified!');
      } else {
        Alert.alert('Not Verified', 'Please check your inbox and click the link.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth().signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.icon}>✉️</Text>
          <Text style={styles.title}>Confirm your email.</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to {user?.email}. Please check your inbox and verify to start scanning.
          </Text>
        </View>

        <View style={styles.form}>
          <Button
            title="I've Verified My Email"
            onPress={handleCheckStatus}
            loading={loading}
          />
          <Button
            title="Resend Email"
            variant="secondary"
            onPress={handleResend}
          />
          <Button
            title="Log Out"
            variant="tertiary"
            onPress={handleLogout}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[8],
  },
  icon: {
    fontSize: 64,
    marginBottom: theme.spacing[4],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  form: {
    width: '100%',
    gap: theme.spacing[4],
  },
});
