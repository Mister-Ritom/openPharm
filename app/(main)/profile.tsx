import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { useSubscription } from "../../src/hooks/useSubscription";
import { theme } from "../../src/theme/designSystem";

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth().currentUser;
  const { isPro, loading } = useSubscription();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              // Sign out from Google if applicable
              try {
                await GoogleSignin.signOut();
              } catch (e) {
                console.warn("Google Sign-In signOut error:", e);
              }
              // Sign out from Firebase
              await auth().signOut();
            } catch {
              Alert.alert("Error", "There was a problem logging out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </Card>

        <Card variant="elevated" style={styles.card}>
          <Text style={styles.label}>Subscription</Text>
          {loading ? (
            <Text style={styles.value}>Checking…</Text>
          ) : isPro ? (
            <>
              <Text style={[styles.value, styles.proValue]}>Pro Plan ✓</Text>
              <Text style={styles.proNote}>
                Thank you for supporting OpenPharma!
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.value}>Free Plan</Text>
              <Button
                title="Upgrade to Pro"
                onPress={() => router.push("/paywall")}
                style={{ marginTop: theme.spacing[4] }}
              />
            </>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            title="Health Focus & Customization"
            variant="secondary"
            onPress={() => {}}
          />
          <Button
            title="Privacy Policy"
            variant="secondary"
            onPress={() => router.push("/privacy")}
          />
          <Button
            title="Terms of Service"
            variant="secondary"
            onPress={() => router.push("/tos")}
          />
          <Button
            title="Log Out"
            variant="tertiary"
            onPress={handleLogout}
            textStyle={{ color: theme.colors.error }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  container: { padding: theme.spacing[6], paddingBottom: 60 },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: "800",
    marginBottom: theme.spacing[6],
  },
  card: { marginBottom: theme.spacing[4] },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: "600",
  },
  proValue: { color: theme.colors.primary },
  proNote: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginTop: 4,
  },
  actions: { marginTop: theme.spacing[4], gap: theme.spacing[3] },
});
