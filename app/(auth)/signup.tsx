import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getAuth, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, sendEmailVerification } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import { useAnalytics } from '../../src/utils/useAnalytics';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();

  const handleSignup = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    setLoading(true);
    const authInstance = getAuth(getApp());
    const db = getFirestore(getApp());
    try {
      const cred = await createUserWithEmailAndPassword(authInstance, email, password);
      
      // Send verification email
      await sendEmailVerification(cred.user);
      
      // Initialize firestore user document
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: cred.user.email,
        createdAt: serverTimestamp(),
      });

      analytics.trackEvent('user_signup', { method: 'email' });
    } catch (e: any) {
      Alert.alert('Signup Failed', e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const authInstance = getAuth(getApp());
    const db = getFirestore(getApp());
    try {
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('No ID token found');
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const cred = await signInWithCredential(authInstance, googleCredential);
      
      // Check if user exists in firestore, if not, create
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: cred.user.email,
          createdAt: serverTimestamp(),
          displayName: cred.user.displayName,
        });
      }
      
      analytics.trackEvent('login_completed', { method: 'google' });
    } catch (e: any) {
      analytics.trackEvent('auth_error', { method: 'google', error_code: e.code });
      Alert.alert('Google Sign-In Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Join OpenPharma.</Text>
              <Text style={styles.subtitle}>Discover transparency in every bite.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.colors.outline}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={theme.colors.outline}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              <Button
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                style={{ marginTop: theme.spacing[4] }}
              />

              <Button
                title="Already have an account? Log in"
                variant="tertiary"
                onPress={() => router.push('/(auth)/login')}
                style={{ marginTop: theme.spacing[2] }}
              />

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
              </View>

              <Button
                title="Continue with Google"
                variant="secondary"
                onPress={handleGoogleSignIn}
                style={{ marginTop: 0 }}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing[6],
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing[8],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displayMd,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
  },
  form: {
    gap: theme.spacing[6],
  },
  inputContainer: {
    gap: theme.spacing[2],
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounding.lg,
    padding: theme.spacing[4],
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[2],
    gap: theme.spacing[4],
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
  },
  orText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
});
