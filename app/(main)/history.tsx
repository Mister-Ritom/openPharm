import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../src/theme/designSystem';
import { Card } from '../../src/components/ui/Card';
import { RatingBadge } from '../../src/components/ui/RatingBadge';

// Mock data
const HISTORY_MOCK = [
  { id: '1', name: 'Almond Breeze Unsweetened', brand: 'Blue Diamond', rating: 'A', date: 'Today' },
  { id: '2', name: 'Oreo Original', brand: 'Nabisco', rating: 'E', date: 'Yesterday' },
  { id: '3', name: 'Greek Yogurt Plain', brand: 'Chobani', rating: 'A', date: '2 days ago' },
];

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>Your past explorations</Text>

        <FlatList
          data={HISTORY_MOCK}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.card} variant="elevated">
              <View style={styles.cardInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.brandName}>{item.brand}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <RatingBadge rating={item.rating as any} />
            </Card>
          )}
        />
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
