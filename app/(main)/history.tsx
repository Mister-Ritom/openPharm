import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { theme } from '../../src/theme/designSystem';
import { Card } from '../../src/components/ui/Card';
import { RatingBadge } from '../../src/components/ui/RatingBadge';
import { AppNativeAd } from '../../src/components/ui/AppNativeAd';
import { useAuth } from '../../src/hooks/useAuth';
import { useSubscription } from '../../src/hooks/useSubscription';
import { getFirestore, collection, query, orderBy, onSnapshot } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { format } from 'date-fns';

type HistoryItem = { type: 'scan'; id: string; [key: string]: any } | { type: 'ad'; id: string };

/**
 * Injects ad placeholders into a list of scan items at randomized positions.
 * Rules:
 *  - Randomly decides if an ad appears in the first 3 items (50% chance).
 *  - After that, enforces a minimum gap of 5 real items between ads.
 *  - At most 1 ad per 5 items overall to avoid spam.
 */
function injectAds(scans: any[]): HistoryItem[] {
  const result: HistoryItem[] = [];
  let itemsSinceLastAd = 0;
  let adIndex = 0;

  // Randomly decide initial offset (0–2) for first ad position
  const initialOffset = Math.floor(Math.random() * 3);

  for (let i = 0; i < scans.length; i++) {
    result.push({ type: 'scan', ...scans[i] });
    itemsSinceLastAd++;

    const isFirstAdSlot = i === initialOffset && itemsSinceLastAd >= 1;
    const isRegularSlot = itemsSinceLastAd >= 5 + Math.floor(Math.random() * 4); // 5–8 gap

    if (isFirstAdSlot || isRegularSlot) {
      result.push({ type: 'ad', id: `ad_${adIndex++}` });
      itemsSinceLastAd = 0;
    }
  }
  return result;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [rawHistory, setRawHistory] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const db = getFirestore(getApp());
    const q = query(
      collection(db, 'users', user.uid, 'scans'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap: any) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setRawHistory(docs);
      setLoading(false);
    }, (error) => {
      console.error('History fetch error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Re-inject ads whenever raw data changes or isPro status changes
  React.useEffect(() => {
    if (isPro) {
      // Pro users see a clean list with no ads
      setHistory(rawHistory.map(s => ({ type: 'scan', ...s })));
    } else {
      setHistory(injectAds(rawHistory));
    }
  }, [rawHistory, isPro]);

  const renderDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate();
      return format(date, 'MMM d, h:mm a');
    } catch (e) {
      return '';
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          {history.length > 0 ? 'Your past explorations' : 'No scans yet. Start exploring!'}
        </Text>

        <FlatList
          data={history}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'ad') {
              return <AppNativeAd isPro={isPro} />;
            }
            return (
              <Card
                style={styles.card}
                variant="elevated"
                onPress={() => router.push({
                  pathname: "/(main)/result",
                  params: { barcode: item.barcode }
                })}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.name || 'Unknown Product'}</Text>
                  <Text style={styles.brandName}>{item.brand || 'No Brand'}</Text>
                  <Text style={styles.date}>{renderDate(item.timestamp)}</Text>
                </View>
                <RatingBadge rating={item.rating || 'N/A'} />
              </Card>
            );
          }}
          refreshing={loading}
        />
      </View>
    </View>
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
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing[6],
  },
  list: {
    gap: theme.spacing[3],
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    paddingRight: theme.spacing[4],
  },
  productName: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
    fontWeight: '700',
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
  }
});
