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

Product data cache. Populated by `onScanProduct` (OpenFoodFacts) or `onOCRSubmit` (OCR).

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
  },
  warnings: any[],             // Populated by analyzeProduct()
  productImageUrl?: string,    // From OpenFoodFacts or user-uploaded to Storage
  labelImageUrl?: string,      // Only for OCR submissions
  dataSource: 'OpenFoodFacts' | 'OCR+AI',
  isEditable: boolean,         // false for OFF products, true for OCR products
  flaggedForReview?: boolean,  // Set if 3+ reports exist for this barcode
  lastEditedBy?: string,       // UID of last user to edit (set by updateProduct function)
  createdAt: Timestamp,
  updatedAt?: Timestamp,
}
```

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
| `/users/{uid}/**` | Auth + own UID only | Auth + own UID only |
| `/products/{barcode}` | Any authenticated user | `false` (Cloud Functions only) |
| `/reports/{reportId}` | `false` | Any authenticated user (create only) |
| `/ingredients/{slug}` | Any authenticated user | `false` |

---

## Firebase Storage

- **Default bucket**: `me.ritom.openpharm.firebasestorage.app` (or `{projectid}.firebasestorage.app`)
- **Rules file**: `storage.rules`

**Storage structure** (by convention, not enforced by rules currently):
```
{barcode}/label.jpg          ← Nutrition label photo (uploaded by scan.tsx before OCR)
{barcode}/product_custom.jpg ← User-uploaded product front photo (from result.tsx)
```

Uploads are done from the client using `storage().ref(path).putFile(localUri)`.

---

## Cloud Functions

All exports live in `functions/src/index.ts`. The functions package has its own `package.json` and `tsconfig.json` inside `functions/`.

### `onScanProduct` — v2 HTTPS Callable

**Trigger**: Client call `functions().httpsCallable('onScanProduct')({ barcode })`
**Auth**: Required (`unauthenticated` error if no auth)
**Timeout**: 30 seconds

**Flow**:
1. Increment usage counter (`incrementUserScanCount`)
2. Fetch user profile from Firestore
3. Try Open Food Facts API
4. If found: build `NutritionData`, run `analyzeProduct(rawData, profile)`, cache in `/products`, log to `/users/{uid}/scans`, return merged result
5. If not found: check Firestore `/products/{barcode}` cache
6. If still not found: return `{ found: false, barcode }`

**Returns**: Product + analysis merged object (same shape as `/products/{barcode}` + analysis fields like `grade`, `warnings`, `ratings`)

---

### `onOCRSubmit` — v1 HTTPS Callable

**Trigger**: `functions().httpsCallable('onOCRSubmit')({ barcode, ocrText, labelImageUrl, productImageUrl })`
**Auth**: Required
**Runtime**: 60s timeout, 512MB memory

**Flow**:
1. Increment usage counter
2. Call `parseNutritionOCR(ocrText, GEMINI_API_KEY)` — uses Gemini API key for AI-enhanced parsing
3. Get user profile for personalized analysis
4. Run `analyzeProduct(rawData, profile)`
5. Save product with `isEditable: true`
6. Log to `/users/{uid}/scans`
7. Return merged product + analysis

**Gemini key**: `process.env.GEMINI_API_KEY` (should be a Firebase Secret in production) — currently has a fallback hardcoded key in source.

---

### `updateProduct` — v1 HTTPS Callable

**Trigger**: `functions().httpsCallable('updateProduct')({ barcode, updates })`
**Auth**: Required
**Purpose**: Lets users edit OCR-sourced products (name, brand, productImageUrl, nutrients)

**Guards**:
- Product must exist in Firestore
- Product must have `isEditable: true`

**Allowed update fields**: `name`, `brand`, `productImageUrl`, `nutrients` (merged, not replaced)

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
| `GEMINI_API_KEY` | Cloud Function env | Should use `defineSecret()` in v2 functions in production |
| RevenueCat iOS key | Hardcoded in `useSubscription.ts` | Public SDK key, safe to be in client code |
| RevenueCat Android key | Hardcoded in `useSubscription.ts` | Public SDK key |
| PostHog API key | Hardcoded in `app/_layout.tsx` | Public key |
| Google Web Client ID | Hardcoded in `app/_layout.tsx` | Public, required for Google Sign-In |
