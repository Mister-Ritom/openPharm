import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeMediaView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';
import { theme } from '../../theme/designSystem';
import { getAdUnitId } from '../../constants/Ads';

/**
 * Inner component that renders the native ad content.
 * Must be a child of <NativeAdView>.
 */
function NativeAdContent({ ad }: { ad: NativeAd }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {ad.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image 
              source={{ uri: ad.icon.url }} 
              style={styles.iconImg} 
            />
          </NativeAsset>
        )}
        <View style={styles.headerText}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {ad.headline}
            </Text>
          </NativeAsset>
        </View>
      </View>

      <View style={styles.sponsoredBadge}>
        <Text style={styles.sponsoredText}>Sponsored</Text>
      </View>

      <NativeMediaView style={styles.mediaView} />

      <NativeAsset assetType={NativeAssetType.BODY}>
        <Text style={styles.body} numberOfLines={2}>
          {ad.body}
        </Text>
      </NativeAsset>

      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
        <Text style={styles.ctaText}>
          {ad.callToAction}
        </Text>
      </NativeAsset>
    </View>
  );
}

/**
 * Skeleton/placeholder shown while the native ad is loading.
 */
function NativeAdPlaceholder() {
  return (
    <View style={[styles.container, styles.placeholder]}>
      <View style={styles.placeholderHeader}>
        <View style={styles.placeholderIcon} />
        <View style={styles.placeholderLines}>
          <View style={[styles.placeholderLine, { width: '70%' }]} />
          <View style={[styles.placeholderLine, { width: '40%', marginTop: 4 }]} />
        </View>
      </View>
      <View style={[styles.placeholderMedia, { marginTop: theme.spacing[3] }]} />
    </View>
  );
}

interface AppNativeAdProps {
  /** If true (Pro user) the component renders nothing. */
  isPro?: boolean;
}

/**
 * Themed native ad wrapper.
 * Uses the explicit loading pattern for stability in v16.3.1.
 * Renders nothing for Pro subscribers.
 */
export function AppNativeAd({ isPro }: AppNativeAdProps) {
  const [ad, setAd] = React.useState<NativeAd | null>(null);
  const [error, setError] = React.useState(false);
  const loadingRef = React.useRef(false);

  if (isPro) return null;

  const adUnitId = getAdUnitId('native');

  React.useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    let currentAd: NativeAd | null = null;
    const adRequest = NativeAd.createForAdRequest(adUnitId, {
      keywords: ['lifestyle', 'medical', 'patients', 'food', 'healthy foods', 'wellness'],
    });

    adRequest
      .then((loadedAd) => {
        console.log('[AdMob] Native ad loaded successfully');
        currentAd = loadedAd;
        setAd(loadedAd);
        setError(false);
      })
      .catch((e) => {
        console.error('[AdMob] Native ad failed to load:', e);
        setError(true);
      })
      .finally(() => {
        loadingRef.current = false;
      });

    return () => {
      if (currentAd) {
        console.log('[AdMob] Destroying native ad instance');
        currentAd.destroy();
      }
    };
  }, [adUnitId]);

  if (error) {
    return null;
  }

  if (!ad) {
    return <NativeAdPlaceholder />;
  }

  return (
    <NativeAdView
      nativeAd={ad}
      style={styles.adView}
    >
      <NativeAdContent ad={ad} />
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  adView: {
    width: '100%',
    marginVertical: theme.spacing[4],
  },
  container: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounding.default,
    padding: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.outline + '22',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
    gap: theme.spacing[3],
  },
  iconImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  headerText: {
    flex: 1,
  },
  headline: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    backgroundColor: theme.colors.primaryContainer + '22',
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: 4,
  },
  sponsoredText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mediaView: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.surface,
  },
  body: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: theme.spacing[4],
  },
  ctaText: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.rounding.full,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
    textAlign: 'center',
    width: '100%',
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyMd,
    fontWeight: '700',
    color: theme.colors.onPrimary,
    overflow: 'hidden',
  },
  // Placeholder styles
  placeholder: {
    opacity: 0.6,
  },
  placeholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  placeholderIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  placeholderLines: {
    flex: 1,
  },
  placeholderLine: {
    height: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
  },
  placeholderMedia: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
});
