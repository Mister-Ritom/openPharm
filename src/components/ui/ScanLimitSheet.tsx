import React from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../theme/designSystem';

interface ScanLimitSheetProps {
  visible: boolean;
  lowestPrice: string | null;
  onWatchAd: () => void;
  onViewPlans: () => void;
  onDismiss: () => void;
}

const { height } = Dimensions.get('window');

export function ScanLimitSheet({
  visible,
  lowestPrice,
  onWatchAd,
  onViewPlans,
  onDismiss,
}: ScanLimitSheetProps) {
  const translateY = React.useRef(new Animated.Value(height)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: height,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible) return null;



  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔒</Text>
        </View>

        <Text style={styles.title}>Daily Limit Reached</Text>
        <Text style={styles.subtitle}>
          Go Pro for Unlimited Scans, {lowestPrice ? "it's just " : ""}
          <Text style={styles.priceBold}>{lowestPrice || "upgrade now"}</Text> Empower your choices.
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Buy Pro Button */}
        <TouchableOpacity style={styles.plansBtn} onPress={onViewPlans} activeOpacity={0.85}>
          <Text style={styles.plansBtnText}>Buy Pharma pro now</Text>
        </TouchableOpacity>

        {/* Watch Ad Button */}
        <TouchableOpacity style={styles.watchAdBtn} onPress={onWatchAd} activeOpacity={0.85}>
          <Text style={styles.watchAdIcon}>▶</Text>
          <View>
            <Text style={styles.watchAdTitle}>Watch a Short Ad</Text>
            <Text style={styles.watchAdSubtitle}>Unlock +1 scan for free</Text>
          </View>
        </TouchableOpacity>

        {/* Dismiss Link */}
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Maybe Later</Text>
        </TouchableOpacity>

        {/* Safe area bottom padding for iOS */}
        {Platform.OS === 'ios' && <View style={{ height: 20 }} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[6],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    opacity: 0.35,
    marginBottom: theme.spacing[6],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.headlineMd,
    fontWeight: '800',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[5],
  },
  priceBold: {
    fontFamily: theme.typography.fontFamily.headline,
    fontWeight: '900',
    color: theme.colors.primary,
    backgroundColor: '#e6f3ef', // Very light primary-ish background
    paddingHorizontal: 6,
    borderRadius: 6,
    overflow: 'hidden', // Required for borderRadius on Android/iOS Text background
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.outline,
    opacity: 0.15,
    marginBottom: theme.spacing[5],
  },
  watchAdBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: theme.rounding.default,
    borderWidth: 1.5,
    borderColor: theme.colors.outlineVariant,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[5],
    gap: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  watchAdIcon: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  watchAdTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  watchAdSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    marginTop: 2,
  },
  plansBtn: {
    width: '100%',
    borderRadius: theme.rounding.default,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[4],
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  plansBtnText: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  dismissBtn: {
    paddingVertical: theme.spacing[2],
  },
  dismissText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
  },
});
