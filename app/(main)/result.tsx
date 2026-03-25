import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../src/theme/designSystem';
import { Card } from '../../src/components/ui/Card';
import { RatingBadge } from '../../src/components/ui/RatingBadge';
import { Button } from '../../src/components/ui/Button';

export default function ResultScreen() {
  const { data } = useLocalSearchParams();
  const router = useRouter();

  if (!data) return <View style={styles.safe} />;
  
  const product = JSON.parse(data as string);
  const rating = product.grade || 'C'; // A-E
  const nutrients = product.nutrients || {};

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Button variant="tertiary" title="Close" onPress={() => router.back()} style={styles.closeBtn} />
          <Text style={styles.dataSourceLabel}>Data from {product.dataSource || 'System'}</Text>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product.name || 'Unknown Product'}</Text>
              <Text style={styles.brandName}>{product.brand || 'Unknown Brand'}</Text>
            </View>
            <RatingBadge rating={rating} />
          </View>
          
          <Text style={styles.analysisSummary}>
            {product.warnings && product.warnings.length > 0 
              ? `This product has ${product.warnings.length} flags based on your health profile.`
              : 'This product looks safe for your health profile!'}
          </Text>
        </View>

        <Card variant="elevated" style={styles.flagsCard}>
          <Text style={styles.sectionTitle}>Tailored Warnings</Text>
          {product.warnings && product.warnings.length > 0 ? (
            product.warnings.map((warning: any, idx: number) => (
              <View key={idx} style={styles.flagItem}>
                <View style={[styles.flagDot, { backgroundColor: warning.severity === 'high' ? theme.colors.error : theme.colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagIngredient}>{warning.ingredient}</Text>
                  <Text style={styles.flagText}>{warning.reason}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No major flags detected based on your active health profile.</Text>
          )}
        </Card>

        <Card style={styles.nutrimentsCard}>
          <Text style={styles.sectionTitle}>Nutrition Highlights (per 100g)</Text>
          <View style={styles.nutrimentGrid}>
            <View style={styles.nutriItem}>
              <Text style={styles.nutriValue}>{nutrients.energy_kcal ?? '--'}</Text>
              <Text style={styles.nutriLabel}>Kcal</Text>
            </View>
            <View style={styles.nutriItem}>
              <Text style={styles.nutriValue}>{nutrients.sugar_g ?? '--'}g</Text>
              <Text style={styles.nutriLabel}>Sugars</Text>
            </View>
            <View style={styles.nutriItem}>
              <Text style={styles.nutriValue}>{nutrients.fat_g ?? '--'}g</Text>
              <Text style={styles.nutriLabel}>Total Fat</Text>
            </View>
            <View style={styles.nutriItem}>
              <Text style={styles.nutriValue}>{nutrients.sodium_mg ?? '--'}mg</Text>
              <Text style={styles.nutriLabel}>Sodium</Text>
            </View>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    padding: theme.spacing[6],
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  closeBtn: {
    paddingHorizontal: 0,
  },
  dataSourceLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    textTransform: 'uppercase',
  },
  heroSection: {
    marginBottom: theme.spacing[8],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[4],
  },
  productName: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
    paddingRight: theme.spacing[4],
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  analysisSummary: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
    lineHeight: 28,
  },
  flagsCard: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: theme.spacing[4],
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: theme.spacing[3],
  },
  flagIngredient: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  flagText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.outline,
  },
  nutrimentsCard: {
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  nutrimentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[4],
  },
  nutriItem: {
    width: '45%',
  },
  nutriValue: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineMd,
    color: theme.colors.onSurface,
    fontWeight: '800',
  },
  nutriLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  }
});
