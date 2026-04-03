import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { collection, getFirestore, limit, onSnapshot, orderBy, query } from "@react-native-firebase/firestore";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdEventType, RewardedAd, RewardedAdEventType } from "react-native-google-mobile-ads";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { RatingBadge } from "../../src/components/ui/RatingBadge";
import { ScanLimitSheet } from "../../src/components/ui/ScanLimitSheet";
import { getAdUnitId } from "../../src/constants/Ads";
import { CONFIG } from "../../src/constants/Config";
import { useAuth } from "../../src/hooks/useAuth";
import { useScanCount } from "../../src/hooks/useScanCount";
import { useSubscription } from "../../src/hooks/useSubscription";
import { theme } from "../../src/theme/designSystem";

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [profileName, setProfileName] = useState("General Focus");
  const { isPro, lowestPrice } = useSubscription();
  const { count, loading: loadingCount } = useScanCount();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showLimitSheet, setShowLimitSheet] = useState(false);

  // Rewarded ad ref — loads in background so it's ready when user needs it
  const rewardedAdRef = useRef<RewardedAd | null>(null);
  const rewardEarnedRef = useRef(false);

  // Pre-load rewarded ad so it's ready immediately when summoned
  useEffect(() => {
    if (isPro) return; // No ads for Pro users
    try {
      const ad = RewardedAd.createForAdRequest(getAdUnitId('rewarded'), {
        keywords: ['lifestyle', 'medical', 'patients', 'food', 'healthy foods', 'wellness'],
      });
      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] Rewarded ad loaded and ready');
        rewardedAdRef.current = ad;
      });
      const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewardEarnedRef.current = true;
        console.log('[AdMob] Rewarded ad: reward earned');
      });
      ad.load();
      return () => { unsubLoaded(); unsubEarned(); };
    } catch (e) {
      console.error('[AdMob] Rewarded ad preload error:', e);
    }
  }, [isPro]);
  // Load health profile label and history feed
  useEffect(() => {
    AsyncStorage.getItem("health_profile").then((p) => {
      if (p === "diabetic") setProfileName("Sugar & Diabetes Watch");
      if (p === "pcos") setProfileName("PCOS & Hormones Focus");
      if (p === "heart") setProfileName("Heart & Cholesterol Guard");
    });

    if (!user) return;

    const db = getFirestore(getApp());
    const q = query(
      collection(db, "users", user.uid, "scans"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Group by barcode to avoid duplicates in recent insights
        const grouped = docs.reduce((acc: any[], current: any) => {
          const existing = acc.find((item: any) => item.barcode === current.barcode);
          if (existing) {
            existing.count = (existing.count || 1) + 1;
            // The first occurrence is the latest due to orderBy("timestamp", "desc")
          } else {
            acc.push({ ...current, count: 1 });
          }
          return acc;
        }, []);

        setHistory(grouped.slice(0, 3));
        setLoadingHistory(false);
      },
      (error) => {
        console.error("[Home] History fetch error:", error);
        setLoadingHistory(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const remainingScans = Math.max(0, CONFIG.FREE_SCAN_LIMIT - count);

  /** Called when user taps "Scan a Barcode" */
  const handleScanPress = () => {
    if (!isPro && count >= CONFIG.FREE_SCAN_LIMIT) {
      setShowLimitSheet(true);
      return;
    }
    router.push("/(main)/scan");
  };

  /** User taps "Watch Ad" in the limit sheet */
  const handleWatchAd = async () => {
    setShowLimitSheet(false);
    const ad = rewardedAdRef.current;
    if (!ad) {
      Alert.alert('Ad Not Ready', 'The ad is still loading. Please try again in a moment.');
      return;
    }
    try {
      rewardEarnedRef.current = false;
      
      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        if (rewardEarnedRef.current) {
          router.push({ pathname: "/(main)/scan", params: { rewarded: 'true' } });
        }
        unsubClosed();
        ad.load();
      });

      await ad.show();
    } catch (e) {
      console.error('[AdMob] Rewarded ad show error:', e);
      Alert.alert('Ad Error', 'Could not load the ad. Please try again.');
    }
  };

  const renderDate = (timestamp: any, count: number = 1) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate();
      const formatted = format(date, "MMM d, h:mm a");
      return count > 1 ? `Last scanned on ${formatted}` : formatted;
    } catch (e) {
      return "";
    }
  };

  const displayName = user?.displayName || profile?.displayName || "Explorer";
  const firstName = displayName.split(" ")[0];

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {firstName}.</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileText}>{profileName}</Text>
          </View>
        </View>

        {/* Action Area */}
        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Ready to Check?</Text>
          <Text style={styles.sectionDesc}>
            Uncover the truth behind the label.
          </Text>
          {!isPro && !loadingCount && (
            <Text style={styles.scanCountText}>
              {remainingScans} free scan{remainingScans === 1 ? '' : 's'} remaining today
            </Text>
          )}
          <Button
            title="Scan a Barcode"
            onPress={handleScanPress}
            style={{ marginTop: theme.spacing[4] }}
          />
        </View>

        {/* Home screen usually has a condensed history view below */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>

          {loadingHistory ? (
            <Text style={styles.emptyText}>Loading your recent explorations...</Text>
          ) : history.length > 0 ? (
            <View style={styles.historyList}>
              {history.map((item) => (
                <Card
                  key={item.id}
                  style={styles.historyCard}
                  variant="elevated"
                  onPress={() => router.push({
                    pathname: "/(main)/result",
                    params: { barcode: item.barcode }
                  })}
                >
                  <View style={styles.cardInfo}>
                    <View style={styles.productNameRow}>
                      <Text
                        style={[styles.productName, { flexShrink: 1 }]}
                        numberOfLines={1}
                      >
                        {item.name || "Unknown Product"}
                      </Text>
                      {item.count > 1 && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={styles.separator}>|</Text>
                          <Text style={styles.scanCountHighlight}>
                            {`x${item.count}`}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.brandName}>{item.brand || "No Brand"}</Text>
                    <Text style={styles.date}>{renderDate(item.timestamp, item.count)}</Text>
                  </View>
                  <RatingBadge rating={item.rating || "N/A"} />
                </Card>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Head to the History tab to see your full exploration list and deep
              clinical insights.
            </Text>
          )}

          <Button
            title="View Full History"
            variant="tertiary"
            onPress={() => router.push("/(main)/history")}
            style={{ marginTop: theme.spacing[2] }}
          />
        </View>
      </ScrollView>

      {/* Scan Limit Bottom Sheet — only shown for free users who hit their limit */}
      <ScanLimitSheet
        visible={showLimitSheet}
        lowestPrice={lowestPrice}
        onWatchAd={handleWatchAd}
        onViewPlans={() => { setShowLimitSheet(false); router.push({ pathname: '/paywall', params: { autoPurchase: 'true' } }); }}
        onDismiss={() => setShowLimitSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.surface },
  container: { padding: theme.spacing[6], paddingBottom: 100 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing[6],
  },
  greeting: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: "800",
  },
  profileBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.rounding.full,
  },
  profileText: {
    color: theme.colors.onPrimaryContainer,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: "700",
  },
  upgradeCard: {
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing[8],
  },
  scanCountText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
    marginTop: theme.spacing[2],
  },
  upgradeTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onPrimary,
    fontWeight: "700",
    marginBottom: theme.spacing[2],
  },
  upgradeDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onPrimary,
    opacity: 0.9,
    marginBottom: theme.spacing[4],
    lineHeight: 22,
  },
  scanSection: { marginBottom: theme.spacing[8] },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: "700",
    marginBottom: theme.spacing[2],
  },
  sectionDesc: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
  },
  recentSection: { flex: 1, marginTop: theme.spacing[2] },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
    marginTop: theme.spacing[2],
    lineHeight: 22,
  },
  historyList: {
    gap: theme.spacing[3],
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing[4],
  },
  cardInfo: {
    flex: 1,
    paddingRight: theme.spacing[4],
  },
  productName: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: "700",
  },
  productNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
    marginHorizontal: theme.spacing[2],
    opacity: 0.5,
  },
  scanCountHighlight: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  date: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginTop: theme.spacing[2],
  },
});
