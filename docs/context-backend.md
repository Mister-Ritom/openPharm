# OpenPharma — Backend & Data Layer Context

> **For AI agents**: This file covers Firebase, Firestore schema, Cloud Functions, RevenueCat, and security rules. After completing any task that changes the data model, adds/removes Cloud Functions, or modifies security rules, update this file so future agents have the accurate picture.

---

## Firebase Project

- **Project alias** (`.firebaserc`): configured via `firebase use`
- **Config files**: `google-services.json` (Android), `GoogleService-Info.plist` (iOS) — both in the project root
- **Services in use**: Auth, Firestore, Cloud Functions, Firebase Storage
- **Region**: Cloud Functions deploy to `us-central1` (default)

---

## Firestore Schema

All collections live in the `(default)` Firestore database.

### `/users/{uid}`

Top-level user document. Created on signup with minimal fields, then populated fully after `setup-profile` screen.

```ts
{
  uid: string,                        // Firebase Auth UID
  email?: string,                     // Present for email/Google signups
  phoneNumber?: string,               // Present for phone signups
  displayName?: string,               // Set during setup-profile
  healthProfiles?: string[],          // e.g. ['diabetic', 'heart'] — set during setup-profile
  ageRange?: string,                  // e.g. '25-34' — set during setup-profile
  notifications?: boolean,            // User notification pref — set during setup-profile
  hasOnboarded?: boolean,             // true once setup-profile is completed
  primaryGoal?: string,               // Set by onboarding step4 (single profile selection)
  createdAt: Timestamp,
  lastActiveAt?: Timestamp,
}
```

**Profile completeness** (navigation guard checks): `displayName`, `healthProfiles`, and `ageRange` must all be truthy.

---

### `/users/{uid}/scans/{scanId}` (subcollection)

One document per product scan event. Used for history display and daily scan count.

```ts
{
  barcode: string,         // Product barcode or 'manual-ocr' / 'manual'
  name: string,            // Product name
  brand: string,           // Brand name
  rating: 'A'|'B'|'C'|'D'|'E',
  timestamp: Timestamp,    // Server-set via FieldValue.serverTimestamp()
}
```

**Daily scan limit** is enforced client-side by querying this collection where `timestamp >= startOfDay(today)`. The `useScanCount` hook returns the live count. The hard gate exists in `scan.tsx`.

---

### `/users/{uid}/usage/today` (subcollection doc)

A single document used server-side to track daily scan count (separate from the scans subcollection, which is for history display).

```ts
{
  date: string,       // ISO date string 'YYYY-MM-DD'
  count: number,      // Incremented per scan via transaction
  lastScanAt: Timestamp,
}
```

This is reset lazily: if `data.date !== todayStr`, it is overwritten with `count: 1`. The `scheduledDailyReset` Cloud Function runs daily but only does logging/analytics aggregation (the actual reset is lazy).

---

### `/users/{uid}/subscription/current` (subcollection doc)

Written by `onRevenueCatWebhook` Cloud Function. Mirrors RevenueCat subscription state for server-side checks.

```ts
{
  status: 'active' | 'free',
  plan?: string,      // RevenueCat product_id
  platform?: string,  // 'APP_STORE' | 'PLAY_STORE'
  updatedAt: Timestamp,
}
```

**Note**: Client-side Pro status is determined directly from RevenueCat SDK (entitlement `'OpenPharma Pro'`), NOT from this Firestore document. This subcollection is for server-side verification if needed in the future.

---

### `/products/{barcode}`

Product data cache. Populated by `onScanProduct` (OpenFoodFacts), `onOCRSubmit` (new OCR product), or `onOCRUpdate` (re-scan correction).

```ts
{
  barcode: string,
  name: string,
  brand: string,
  ingredients?: string[],      // Array of ingredient strings (from OpenFoodFacts)
  nutrients: {
    energy_kcal: number,
    protein_g: number,
    carbohydrate_g: number,
    fat_g: number,
    saturated_fat_g: number,
    trans_fat_g: number,
    sugar_g: number,
    sodium_mg: number,
    fiber_g?: number,          // Added in v3
    cholesterol_mg?: number,    // Added in v3
  },
  // NOTE: warnings and healthScore are NO LONGER stored in Firestore. 
  // They are calculated dynamically by the client-side analysisEngine.ts.
  productImageUrl?: string,    // ONLY set when user explicitly picks from gallery in result screen.
                               // Never set by OCR or barcode scan flows.
  referenceImages?: {          // Map of reference scan photos for debugging/review.
    nutritionLabel?: string,   // URL of nutrition panel photo (from OCR scans).
    ingredients?: string,      // URL of ingredients panel photo.
    frontOfPack?: string,      // URL of front-of-pack reference photo.
  },
  // Deprecated — use referenceImages.nutritionLabel instead:
  labelImageUrl?: string,
  dataSource: 'OpenFoodFacts' | 'OCR+AI',
  isEditable: boolean,         // true for most products to allow user corrections.
                               // Set to false only by admins for verified clinical data.
  isIncomplete: boolean,       // true when OFF returned the product but all major nutrients are 0.
                               // Prompts user to scan the nutrition label.
  flaggedForReview?: boolean,  // Set if 3+ reports exist for this barcode
  lastEditedBy?: string,       // UID of last user to edit
  createdAt: Timestamp,
  updatedAt?: Timestamp,
}
```

> [!IMPORTANT]
> **Client-Side Analysis**: The backend stores only **raw nutritional data**. The `analyzeProduct()` utility (found in `src/utils/analysisEngine.ts`) MUST be run by the client to generate warnings, grades, and health scores. This ensures analysis is always dynamic based on the user's latest health profile.

**Security**: Direct client writes are `false`. All writes go via Cloud Functions.

---

### `/reports/{reportId}`

User-submitted product flag/report.

```ts
{
  barcode: string,
  // other fields from reporter
}
```

`onProductFlagged` function triggers on creation and sets `flaggedForReview: true` on the product if ≥3 reports exist for the same barcode.

---

### `/ingredients/{slug}` (read-only lookup table)

Currently read-only from clients. Used for future ingredient lookup features.

---

## Firestore Security Rules Summary

File: `firestore.rules`

| Path | Read | Write |
|------|------|-------|
| `/users/{uid}/**` | Auth + own UID only | Auth + own UID only (Except for scans and usage) |
| `/users/{uid}/usage/{docId}` | Auth + own UID only | Increment operations only by client |
| `/users/{uid}/scans/{scanId}`| Auth + own UID only | Create only by client |
| `/products/{barcode}` | Any authenticated user | `false` (Cloud Functions only) |
| `/reports/{reportId}` | `false` | Any authenticated user (create only) |
| `/ingredients/{slug}` | Any authenticated user | `false` |

---

## Firebase Storage

- **Default bucket**: `me.ritom.openpharm.firebasestorage.app` (or `{projectid}.firebasestorage.app`)
- **Rules file**: `storage.rules`

**Storage structure** (by convention, not enforced by rules currently):
```
{barcode}/ref_nutritionLabel.jpg  ← Nutrition label reference photo (uploaded during OCR scan)
{barcode}/ref_ingredients.jpg     ← Ingredients panel reference photo
{barcode}/ref_frontOfPack.jpg     ← Front-of-pack reference photo
{barcode}/product_custom.jpg      ← User-chosen product display photo (from gallery in result screen)
```

**Important distinction**: `ref_*.jpg` files are reference photos for debugging/review and are stored in `product.referenceImages`. They are **never** set as `productImageUrl`. Only `product_custom.jpg` gets linked to `productImageUrl`, and only when the user explicitly taps the product image icon and picks from their gallery.

Uploads are done from the client using `storage().ref(path).putFile(localUri)`.

---

## Cloud Functions

All exports live in `functions/src/index.ts`. The functions package has its own `package.json` and `tsconfig.json` inside `functions/`.

### `cacheProduct` — v2 HTTPS Callable (Replaces `onScanProduct`)

**Trigger**: Client call `functions().httpsCallable('cacheProduct')({ barcode, productData })`
**Auth**: Required (`unauthenticated` error if no auth)
**Timeout**: 30 seconds
**Purpose**: Background caching of product data fetched directly by the client from Open Food Facts.

**Flow**:
1. Save the `productData` to Firestore `/products/{barcode}`.

**Returns**: `{ success: true }`

*(Note: `onScanProduct` is deprecated and throws an error if called by older clients.)*

---

### `onOCRSubmit` — v1 HTTPS Callable

**Trigger**: `functions().httpsCallable('onOCRSubmit')({ barcode, ocrText, labelImageUrl, imageType? })`
**Auth**: Required
**Runtime**: 60s timeout, 512MB memory

**Flow**:
1. Increment usage counter (Now handled on client-side)
2. Call `parseNutritionOCR(ocrText, labelImageUrl, GEMINI_API_KEY)` — uses **Gemini Flash Lite** with **Structured Outputs** (JSON Schema) for consistent, low-cost extraction.
3. Save product with `isEditable: true`, `isIncomplete: false`, `productImageUrl: null`
4. Stores label photo URL in `referenceImages[imageType]` (default: `nutritionLabel`)
5. **Returns the full, parsed product JSON directly** to the client.
6. (Client runs `analyzeProduct` locally on this returned data).

**Note**: This function NO LONGER performs analysis. It only extracts raw data.

**Gemini key**: `process.env.GEMINI_API_KEY` (should be a Firebase Secret in production).

---

### `onOCRUpdate` — v1 HTTPS Callable

**Trigger**: `functions().httpsCallable('onOCRUpdate')({ barcode, ocrText, labelImageUrl, imageType? })`
**Auth**: Required
**Runtime**: 60s timeout, 512MB memory
**Purpose**: Corrects an existing product by merging new OCR data into it. Called when user taps "Something look wrong?" in `result.tsx`.

**Key differences from `onOCRSubmit`**:
- Does **NOT** increment the usage counter (correction, not a new scan)
- Looks up the existing product document and merges into it
- Forces `isEditable: true`, `dataSource: 'OCR+AI'`, `isIncomplete: false` regardless of original
- Preserves `productImageUrl` from the existing record
- Merges `referenceImages` map rather than replacing it

**Flow**:
1. Parse OCR text via `parseNutritionOCR()` using **Gemini Flash Lite** and **Structured Outputs**.
2. Fetch existing product from Firestore
3. Merge new nutrient data + metadata into the existing doc
4. Update `referenceImages[imageType]` with new photo URL
5. **Returns the fully updated product JSON** to the client.
6. (Client performs analysis locally on this returned data).

**Note**: Like `onOCRSubmit`, this function is and only extracts raw data updates.

---

### `updateProduct` — v1 HTTPS Callable

**Trigger**: `functions().httpsCallable('updateProduct')({ barcode, updates })`
**Auth**: Required
**Purpose**: Lets users edit OCR-sourced products (name, brand, productImageUrl, nutrients, referenceImages)

**Guards**:
- Product must exist in Firestore
- Product must have `isEditable: true`

**Allowed update fields**: `name`, `brand`, `productImageUrl`, `nutrients` (merged, not replaced), `referenceImages` (merged, not replaced)

**Client-side usage pattern** (in `result.tsx`):
- Changes are queued in `pendingUpdates` state
- A 4-second debounce timer fires the function call
- On component unmount, any remaining `pendingUpdates` are flushed immediately (fire-and-forget)

---

### `onRevenueCatWebhook` — v2 HTTP Request

**Trigger**: HTTP POST to the deployed function URL (configured in RevenueCat dashboard)
**Auth**: None (should add signature verification in production)
**Handled events**: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`

Maps RevenueCat `app_user_id` → Firebase UID (they are the same, because RevenueCat is synced via `Purchases.logIn(uid)` in the client).

---

### `onUserDeleted` — v1 Auth Trigger

Triggered on Firebase Auth user deletion. Deletes the `/users/{uid}` document. Subcollections are NOT recursively deleted (noted as a known limitation in the code comments).

---

### `scheduledDailyReset` — v2 Scheduler

Runs `every day 00:00`. Currently only logs. Actual scan count reset is lazy (done inline in `incrementUserScanCount` when date changes).

---

### `onProductFlagged` — v2 Firestore Trigger

**Trigger**: On new document created in `reports/{reportId}`
**Effect**: If ≥3 reports exist for a barcode, sets `flaggedForReview: true` on `/products/{barcode}`

---

## Deleted / Deprecated Logic

### Backend Analysis Engine (DELETED)
The file `functions/src/utils/analysisEngine.ts` and its associated data files (`harmfulIngredients.json`, `nutritionalThresholds.json`) were deleted in April 2026. 

**Rationale**:
1. **Latency**: Moving analysis to the client removes a round-trip to the server.
2. **Dynamicity**: Nutritional warnings depend on the user's health profile (diabetic, heart disease, etc.). Performing this on the client allows for instant updates as users change their profiles without re-fetching product data.
3. **Threshold v3 Migration**: The application now uses a robust `v3` nutritional threshold dataset (stored in `assets/data/nutritionalThresholds.json`) which supports advanced factors like Trans Fat, Fiber, and Cholesterol.

---

## RevenueCat Configuration

Full details in `docs/revenuecat-config.md`. Summary:

| Key | Value |
|-----|-------|
| Project ID | `proj91487d83` |
| Entitlement | `OpenPharma Pro` (ID: `entl3513708de7`) |
| iOS API Key | `appl_zCEpFDZWyrdyjCJJgXUQhvNLKFd` |
| Android API Key | `goog_EyLMzhvFpCtnzYCtafNykCisjoJ` |
| Test Store Key | `RC_TEST_KEY` (used in `__DEV__` mode) |

**Packages** (default offering `ofrng672ae122bb`):
- Monthly — `$rc_monthly` — $2.99/month
- Six Month — `$rc_six_month` — $12.99/6 months  
- Annual — `$rc_annual` — $19.99/year ← highlighted as "Best Value"

**SDK initialization** (`useSubscription.ts`):
1. `configureRevenueCat()` — called in `app/_layout.tsx` on app start (no user ID yet)
2. `syncRevenueCatUser(uid)` — called whenever Firebase auth user changes, calls `Purchases.logIn(uid)` or `Purchases.logOut()` if already non-anonymous

---

## Composite Firestore Indexes

Defined in `firestore.indexes.json`. Key indexes relevant to app queries:
- `users/{uid}/scans` ordered by `timestamp desc` (for history screen)
- `users/{uid}/scans` with `timestamp >= today` filter (for `useScanCount`)

---

## EAS Build Profiles (`eas.json`)

| Profile | Purpose |
|---------|---------|
| `development` | Dev client build for local testing |
| `preview` | Internal distribution build |
| `production` | App Store / Play Store submission |

---

## Environment & Secrets

| Secret/Key | Where | Notes |
|------------|-------|-------|
| `GEMINI_API_KEY` | Firebase Secrets | Securely set via `firebase functions:secrets:set` |

---

## Deployment & Secrets

### Set a Secret
Securely store the Gemini API key in Google Cloud Secret Manager (via Firebase):
```bash
firebase functions:secrets:set GEMINI_API_KEY
```

### Deployment
To build and deploy all functions:
```bash
cd functions && npm run build && firebase deploy --only functions
```

### Accessing Secrets in Code
Secrets must be explicitly requested in the function configuration to be available in `process.env`:
```ts
export const onOCRSubmit = functionsV1.runWith({ 
  secrets: ['GEMINI_API_KEY']
}).https.onCall(async (data, context) => {
  const apiKey = process.env.GEMINI_API_KEY; // now available
  // ...
});
```

| RevenueCat iOS key | Hardcoded in `useSubscription.ts` | Public SDK key, safe to be in client code |
| RevenueCat Android key | Hardcoded in `useSubscription.ts` | Public SDK key |
| PostHog API key | Hardcoded in `app/_layout.tsx` | Public key |
| Google Web Client ID | Hardcoded in `app/_layout.tsx` | Public, required for Google Sign-In |
