# RevenueCat Store Setup Guide

To enable real purchases in OpenPharma, you must configure the products in both Google Play Console and App Store Connect, then link them in RevenueCat.

## 1. Bundle Identifier
Ensure your app's bundle identifier is set to:
`pharma.ritom.in`

## 2. Google Play Store (Android)
1. Go to **Google Play Console** > Your App.
2. Navigate to **Monetize** > **Products** > **Subscriptions**.
3. Create three subscriptions with these exact **Product IDs**:
   - `monthly`
   - `six_month`
   - `yearly`
4. For each subscription, create a **Base Plan** with the ID:
   - `default`
   
**Note**: RevenueCat is configured to look for `monthly:default`, `six_month:default`, and `yearly:default`.

5. In **RevenueCat Dashboard**:
   - The products are already registered and linked to the `default` offering by Antigravity.
   - Ensure you have uploaded your **Google Play Service Account credentials** in Project Settings > Apps > OpenPharma Android.

## 3. Apple App Store (iOS)
1. Go to **App Store Connect** > Your App.
2. Navigate to **Features** > **Subscriptions**.
3. Create a **Subscription Group** (e.g., "Pro Access").
4. Create three subscription products with these IDs:
   - `monthly`
   - `six_month`
   - `yearly`
5. In **RevenueCat Dashboard**:
   - The products are already registered and linked to the `default` offering.
   - Ensure the **Shared Secret** is configured in Project Settings > Apps > OpenPharma iOS.

## 4. Web vs Mobile
- **Mobile**: Full support for real purchases via RevenueCat.
- **Web**: Currently shows a message directing users to the mobile apps/stores.

---

> [!TIP]
> Use the **RevenueCat Debug Overlay** or check the console logs. If you still see "ConfigurationError", it usually means the Play Store service account is not yet linked or the Google Play Console hasn't "published" the products yet (even in draft).
