import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/designSystem';

type Rating = 'A' | 'B' | 'C' | 'D' | 'E';

interface RatingBadgeProps {
  rating: Rating;
}

export function RatingBadge({ rating }: RatingBadgeProps) {
  const color = theme.colors.rating[rating] || theme.colors.outlineVariant;

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{rating}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '800',
  }
});
