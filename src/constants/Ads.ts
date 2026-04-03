import { Platform } from 'react-native';

/**
 * Central configuration for Google AdMob Ad Unit IDs.
 * In __DEV__ mode, always returns Google's official Test IDs to prevent
 * accidental clicks on real ads during development (violates AdMob policy).
 */

const TEST_IDS = {
  native: Platform.select({
    ios: 'ca-app-pub-3940256099942544/3986624511',
    android: 'ca-app-pub-3940256099942544/2247696110',
    default: 'ca-app-pub-3940256099942544/2247696110',
  }),
  rewarded: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
    default: 'ca-app-pub-3940256099942544/5224354917',
  }),
};

const PRODUCTION_IDS = {
  native: Platform.select({
    ios: 'ca-app-pub-2032620092700178/1645499630',
    android: 'ca-app-pub-2032620092700178/9748388347',
    default: 'ca-app-pub-2032620092700178/9748388347',
  }),
  rewarded: Platform.select({
    ios: 'ca-app-pub-2032620092700178/9086772316',
    android: 'ca-app-pub-2032620092700178/2106430991',
    default: 'ca-app-pub-2032620092700178/2106430991',
  }),
};

/**
 * Returns the correct Ad Unit ID for the given type.
 * Automatically uses Google Test IDs in development builds.
 */
export function getAdUnitId(type: 'native' | 'rewarded'): string {
  const ids = __DEV__ ? TEST_IDS : PRODUCTION_IDS;
  return ids[type] ?? '';
}
