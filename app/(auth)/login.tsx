import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
} from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { doc, getDoc, getFirestore } from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui/Button";
import { theme } from "../../src/theme/designSystem";
import { useAnalytics } from "../../src/utils/useAnalytics";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState<any>(null);
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert("Error", "Please enter email and password");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(getAuth(getApp()), email, password);
      analytics.trackEvent("login_completed", { method: "email" });
    } catch (e: any) {
      analytics.trackEvent("auth_error", {
        method: "email",
        error_code: e.code,
      });
      Alert.alert("Login Failed", e.message);
    } finally {
      const auth = getAuth(getApp());
      if (auth.currentUser) {
        const db = getFirestore(getApp());
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (profile?.displayName && profile?.healthProfiles && profile?.ageRange) {
            router.replace("/(main)");
          }
        }
      }
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return Alert.alert("Error", "Please enter your phone number");
    const fullPhone = `${countryCode}${phone.replace(/\s+/g, "")}`;
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(
        getAuth(getApp()),
        fullPhone,
      );
      setConfirm(confirmation);
      analytics.trackEvent("signup_started", { method: "phone" });
    } catch (e: any) {
      analytics.trackEvent("auth_error", {
        method: "phone",
        error_code: e.code,
      });
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return Alert.alert("Error", "Please enter the OTP");
    setLoading(true);
    try {
      await confirm.confirm(otp);
      analytics.trackEvent("login_completed", { method: "phone" });
    } catch (e: any) {
      analytics.trackEvent("auth_error", {
        method: "phone",
        error_code: e.code,
      });
      Alert.alert("Verification Failed", "Invalid code. Please try again.");
    } finally {
      const auth = getAuth(getApp());
      if (auth.currentUser) {
        const db = getFirestore(getApp());
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (profile?.displayName && profile?.healthProfiles && profile?.ageRange) {
            router.replace("/(main)");
          }
        }
      }
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("No ID token found");
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(getAuth(getApp()), googleCredential);
      analytics.trackEvent("login_completed", { method: "google" });
    } catch (e: any) {
      analytics.trackEvent("auth_error", {
        method: "google",
        error_code: e.code,
      });
      Alert.alert("Google Sign-In Error", e.message);
    } finally {
      const auth = getAuth(getApp());
      if (auth.currentUser) {
        const db = getFirestore(getApp());
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          if (profile?.displayName && profile?.healthProfiles && profile?.ageRange) {
            router.replace("/(main)");
          }
        }
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Welcome back.</Text>
              <Text style={styles.subtitle}>
                Log in to continue exploring healthier foods.
              </Text>
            </View>

            <View style={styles.tabContainer}>
              <Button
                title="Email"
                onPress={() => setMethod("email")}
                variant={method === "email" ? "primary" : "tertiary"}
                style={styles.tab}
              />
              <Button
                title="Phone"
                onPress={() => setMethod("phone")}
                variant={method === "phone" ? "primary" : "tertiary"}
                style={styles.tab}
              />
            </View>

            <View style={styles.form}>
              {method === "email" ? (
                <>
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
                      placeholder="Enter your password"
                      placeholderTextColor={theme.colors.outline}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>

                  <Button
                    title="Log In"
                    onPress={handleLogin}
                    loading={loading}
                    style={{ marginTop: theme.spacing[2] }}
                  />
                </>
              ) : (
                <>
                  {!confirm ? (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Phone Number</Text>
                      <View style={styles.phoneInputRow}>
                        <TextInput
                          style={[styles.input, styles.countryCodeInput]}
                          value={countryCode}
                          onChangeText={setCountryCode}
                          placeholder="+91"
                          keyboardType="phone-pad"
                        />
                        <TextInput
                          style={[styles.input, styles.phoneInput]}
                          placeholder="98765 43210"
                          placeholderTextColor={theme.colors.outline}
                          keyboardType="phone-pad"
                          value={phone}
                          onChangeText={setPhone}
                        />
                      </View>
                      <Button
                        title="Get OTP"
                        onPress={handleSendOtp}
                        loading={loading}
                        style={{ marginTop: theme.spacing[4] }}
                      />
                    </View>
                  ) : (
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Verification Code</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="OTP sent to your number."
                        placeholderTextColor={theme.colors.outline}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={setOtp}
                      />
                      <Button
                        title="Verify OTP"
                        onPress={handleVerifyOtp}
                        loading={loading}
                        style={{ marginTop: theme.spacing[4] }}
                      />
                      <Button
                        title="Resend Code"
                        variant="tertiary"
                        onPress={() => setConfirm(null)}
                      />
                    </View>
                  )}
                </>
              )}

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

              <Button
                title="Don't have an account? Sign up"
                variant="tertiary"
                onPress={() => router.push("/(auth)/signup")}
                style={{ marginTop: theme.spacing[2] }}
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
    justifyContent: "center",
  },
  header: {
    marginBottom: theme.spacing[8],
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displayMd,
    color: theme.colors.onSurface,
    fontWeight: "800",
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
  },
  tabContainer: {
    flexDirection: "row",
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8],
  },
  tab: {
    flex: 1,
  },
  form: {
    gap: theme.spacing[4],
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing[4],
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
    fontWeight: "600",
  },
  inputContainer: {
    gap: theme.spacing[2],
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    fontWeight: "600",
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
  phoneInputRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  countryCodeInput: {
    width: 80,
    textAlign: "center",
  },
  phoneInput: {
    flex: 1,
  },
});
