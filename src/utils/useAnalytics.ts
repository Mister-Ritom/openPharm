import { usePostHog } from 'posthog-react-native';

export function useAnalytics() {
  const posthog = usePostHog();

  return {
    identify: (uid: string, props: Record<string, any>) => {
      posthog?.identify(uid, props);
    },
    trackEvent: (eventName: string, properties: Record<string, any>) => {
      posthog?.capture(eventName, properties);
    },
    // Shorthands for specific funnel events
    trackAppOpened: (props: { first_open: boolean, source?: string, referrer?: string }) => {
      posthog?.capture('app_opened', props);
    },
    trackScanScreenOpened: (props: { scans_remaining_today: number, is_pro: boolean }) => {
      posthog?.capture('scan_screen_opened', props);
    },
    trackBarcodeDetected: (props: { barcode: string, format: string }) => {
      posthog?.capture('barcode_detected', props);
    },
    trackProductFoundInCache: (props: { barcode: string, product_name: string }) => {
      posthog?.capture('product_found_in_cache', props);
    },
  };
}
