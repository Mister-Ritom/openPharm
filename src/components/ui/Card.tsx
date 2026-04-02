import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { theme } from '../../theme/designSystem';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'flat';
  onPress?: () => void;
}

export function Card({ children, style, variant = 'flat', onPress }: CardProps) {
  const CardContainer = onPress ? Pressable : View;

  return (
    <CardContainer 
      onPress={onPress}
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        style,
      ]}
    >
      {children}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounding.lg,
    padding: theme.spacing[4],
    overflow: 'hidden',
  },
  elevated: {
    // Mimicking tonal layering 
    shadowColor: '#181c1b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  }
});
