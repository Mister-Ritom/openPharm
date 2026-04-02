# OpenPharma — Master Context File

> **For AI agents**: This file is the authoritative map of the OpenPharma codebase. Read it before touching any file. After completing your task, update this file (and/or `context-backend.md`) to reflect any structural changes, new files, renamed files, new Firestore collections, or changed behavior so the next agent starts with accurate information.

---

## What This App Is

**OpenPharma** (slug: `openPharm`) is a React Native / Expo mobile app (iOS + Android) that lets users scan packaged food product barcodes or photograph nutrition labels to get a personalized health safety rating. The app warns about harmful ingredients and provides tailored advice based on the user's health profile (diabetic, PCOS, heart patient, etc.).

- **Bundle ID (iOS)**: `me.ritom.openpharm`
- **Package name (Android)**: `me.ritom.openpharm`
- **EAS Project ID**: `8ceab29c-f8e6-4ec9-86d1-bfa3894af280`
- **Deep link scheme**: `openpharm://`
- **Associated domain**: `pharma.ritom.in`
- **Firebase project**: see `google-services.json` / `GoogleService-Info.plist`
- **PostHog analytics host**: `https://pharma.ritom.in` (self-hosted proxy)
- **Expo SDK**: `~54.0.33` | **React Native**: `0.81.5` | **React**: `19.1.0`
- **New Architecture**: enabled (`newArchEnabled: true`)
- **React Compiler**: enabled (`reactCompiler: true`)

---

## Repository Layout

```
openPharm/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # ROOT layout — auth guard + navigation logic lives here
│   ├── paywall.tsx         # Full-screen modal paywall (RevenueCat packages)
│   ├── (onboarding)/       # 4-step carousel shown to first-time visitors (no auth needed)
│   ├── (auth)/             # Authentication screens
│   ├── (main)/             # Authenticated tab app
│   └── (legal)/            # Privacy Policy & Terms of Service pages
│
├── src/
│   ├── context/            # React Contexts
│   │   └── OnboardingContext.tsx
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useScanCount.ts
│   │   └── useSubscription.ts
│   ├── utils/              # Pure logic utilities
│   │   ├── analysisEngine.ts   # Core offline product scoring engine
│   │   ├── ocrParser.ts        # Regex-based OCR nutrition label parser
│   │   └── useAnalytics.ts     # PostHog analytics hook
│   ├── components/ui/      # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EditableField.tsx
│   │   ├── RatingBadge.tsx
│   │   └── SkeletonLoader.tsx
│   ├── constants/
│   │   └── Config.ts       # App-level config (FREE_SCAN_LIMIT = 3)
│   └── theme/
│       └── designSystem.ts # Single source of truth for all colors, fonts, spacing
│
├── components/             # Legacy/Expo-default component folder (mostly unused by app screens)
│   └── ui/                 # Keep for Expo-generated boilerplate
│
├── functions/              # Firebase Cloud Functions (Node.js/TypeScript)
│   └── src/
│       ├── index.ts        # All Cloud Function exports
│       └── utils/          # Mirror of src/utils — same analysisEngine + ocrParser run server-side
│
├── assets/
│   ├── images/             # App icons, onboarding images, paywall hero
│   └── data/               # harmfulIngredients.json (bundled, loaded by analysisEngine)
│
├── docs/                   # Developer & AI documentation
│   ├── context.md          # ← this file
│   ├── context-backend.md  # Firestore schema, Cloud Functions, Firebase config
│   ├── revenuecat-config.md
│   ├── adding-store-products.md
│   └── app-store-submission.md
│
├── app.json                # Expo config — permissions, plugins, EAS project ID
├── eas.json                # EAS Build profiles (development, preview, production)
├── firebase.json           # Firebase CLI config (hosting, functions, firestore, storage)
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite indexes
├── storage.rules           # Firebase Storage security rules
├── package.json            # Dependencies
└── tsconfig.json
```

---

## Navigation & Routing (Expo Router — file-based)

The root stack is defined in `app/_layout.tsx`. Navigation is **entirely guard-driven** — no manual `router.push` is needed after auth state changes; the guard re-evaluates and redirects.

### Route Groups

| Group | Path prefix | Requires Auth | Purpose |
|-------|-------------|---------------|---------|
| `(onboarding)` | `/(onboarding)/step1..4` | ❌ No | Value proposition carousel for new visitors |
| `(auth)` | `/(auth)/` | ❌ No | Signup, Login, VerifyEmail, SetupProfile |
| `(main)` | `/(main)/` | ✅ Yes | Bottom-tab authenticated app |
| `(legal)` | `/(legal)/` | ❌ No | Privacy Policy, ToS (accessible from Profile & Paywall) |
| Root | `/paywall` | ✅ Yes | Full-screen modal overlay routes |

### Navigation Guard Logic (in `app/_layout.tsx`)

Lives in `LayoutContent` → `useEffect` that watches `[user, profile, initializing, hasOnboarded]`.

```
No user:
  → not in (onboarding) or (auth) → redirect to /(onboarding)/step1

User logged in, email not verified:
  → redirect to /(auth)/verify-email

User logged in, no Firestore profile doc:
  → redirect to /(auth)/setup-profile

User logged in, profile incomplete (missing displayName, healthProfiles, or ageRange):
  → redirect to /(auth)/setup-profile

User logged in, profile complete:
  → if still in (auth) or (onboarding) → redirect to /(main)

**Implicit screen-level guards**: `login.tsx` and `signup.tsx` also perform an explicit check for completed profiles after successful authentication to provide an immediate `router.replace("/(main)")` and bypass the `setup-profile` screen for returning users.
```

**Profile completeness check**: `!!profile.displayName && !!profile.healthProfiles && !!profile.ageRange`

**Onboarding sync**: If a returning user's Firestore `profile.hasOnboarded = true` but local `AsyncStorage` doesn't have it, the guard syncs it via `setHasOnboarded(true)`.

---

## State Management

| State | Where | Mechanism |
|-------|-------|-----------|
| Auth user + Firestore profile | `useAuth()` hook | Firebase `onAuthStateChanged` + Firestore `onSnapshot` on `/users/{uid}` |
| Onboarding completion status | `OnboardingContext` | AsyncStorage key `onboarding_complete` (value `'true'`) |
| Health profile (primary) | AsyncStorage | Key `health_profile` (string: `'general'`, `'diabetic'`, etc.) |
| Subscription / Pro status | `useSubscription()` | RevenueCat `react-native-purchases` SDK |
| Daily scan count | `useScanCount()` | Firestore real-time query on `users/{uid}/scans` filtered by today |

**No Zustand store is actively used** — the `src/store/` directory exists but is empty.

---

## Screens Reference

### (onboarding) — 4 screens, no auth

| File | Route | Content |
|------|-------|---------|
| `step1.tsx` | `/(onboarding)/step1` | "Sugar. Decoded." — value prop with illustration |
| `step2.tsx` | `/(onboarding)/step2` | Second feature slide |
| `step3.tsx` | `/(onboarding)/step3` | Third feature slide |
| `step4.tsx` | `/(onboarding)/step4` | **Primary Goal selector** — user picks a health profile; calls `completeOnboarding()` which sets AsyncStorage and optionally syncs to Firestore |

Step 4 calls `completeOnboarding(selectedProfile)` from `OnboardingContext`, then `updateDoc` if user is already logged in.

### (auth) — 4 screens

| File | Route | Key Behavior |
|------|-------|-------------|
| `signup.tsx` | `/(auth)/signup` | Email/password + Phone (OTP) + Google Sign-In. On success creates `/users/{uid}` doc in Firestore. Sends email verification for email method. **Checks for returning users after success to skip setup-profile.** |
| `login.tsx` | `/(auth)/login` | Email + Google login. **Checks for returning users after success to skip setup-profile.** |
| `verify-email.tsx` | `/(auth)/verify-email` | Polls/shows verification status, resend option |
| `setup-profile.tsx` | `/(auth)/setup-profile` | **Collects displayName, healthProfiles (multi-select), ageRange, notifications pref**. On save: writes full profile to Firestore `/users/{uid}` with `hasOnboarded: true`, updates AsyncStorage, calls `setHasOnboarded(true)`. Navigation guard then auto-redirects to `/(main)`. |

### (main) — 4 tabs + 1 hidden

| File | Tab | Purpose |
|------|-----|---------|
| `index.tsx` | Home | Greeting, upgrade banner (free users), Scan CTA, history shortcut. Shows `remainingScans` from `useScanCount`. |
| `scan.tsx` | Scan | Camera view. **Mode: `'barcode'`** → auto-scan EAN13/UPC → calls `onScanProduct` Cloud Function. Checks `isIncomplete` flag on result — if true, shows alert prompting nutrition label scan. **Mode: `'nutritionLabel'`** → capture photo → OCR → calls `onOCRSubmit` (new product) or `onOCRUpdate` (correction). Checks daily scan limit before NEW scans; corrections skip the limit check. Accepts `isUpdateMode: 'true'` and `imageType` params. |
| `history.tsx` | History | Real-time FlatList of `users/{uid}/scans` ordered by `timestamp desc`. Shows product name, brand, rating badge, date. |
| `profile.tsx` | Profile | Shows email, subscription status, links to legal pages, Upgrade CTA, Logout. |
| `result.tsx` | Hidden (no tab) | Receives product data via router params (`data` as JSON string). Shows grade badge, warnings, editable nutrient fields. **If `product.isIncomplete === true`**: shows a red warning banner at top prompting label scan (navigates to `scan.tsx` with `isUpdateMode: 'true'`). **"Something look wrong?"** banner now passes `isUpdateMode: 'true'` so the re-scan calls `onOCRUpdate` (updates existing product) instead of creating a new one. Implements **optimistic UI + background debounced save** (4s debounce) via `updateProduct` Cloud Function. **Product image** (`productImageUrl`) is only set when user explicitly picks from gallery — never from OCR flows. Flushes pending updates on unmount. |


### Root-level modal screens

| File | Route | Purpose |
|------|-------|---------|
| `paywall.tsx` | `/paywall` | RevenueCat paywall. Shows 3 package cards (Monthly $2.99, 6-Month $12.99, Annual $19.99). Already-pro users see confirmation screen. Web users see fallback. |

### (legal)

| File | Route | Header behavior |
|------|-------|-----------------|
| `privacy.tsx` | `/(legal)/privacy` | Rendered directly in root stack with `headerTitle: "Privacy Policy"`. iOS native back button works. |
| `tos.tsx` | `/(legal)/tos` | Rendered in root stack with `headerTitle: "Terms of Service"`. |

---

## Core Business Logic

### Product Analysis Pipeline

**Barcode scan path (Local-First):**
1. User scans barcode → `scan.tsx` checks **cloud Firestore** `/products/{barcode}` using `getDocFromServer()` to bypass stale local cache.
2. If found and complete: Runs `analyzeProduct()` on-device using local `nutritionalThresholds.json` and logs scan locally to `/users/{uid}/scans`.
3. If not found in cloud: Client fetches directly from **Open Food Facts API** (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`).
4. If OFF data is complete: Client runs `analyzeProduct()`, logs scan, and triggers fire-and-forget `cacheProduct` Cloud Function to cache for others. **Cached products are set to `isEditable: true` by default.**
5. If tracking data is `isIncomplete` or missing entirely: UI prompts user with **"Nutrition Data Missing"** or **"Product Not Found"** and switches to nutrition label mode.

**OCR / Nutrition label path (new product):**
1. User takes photo → optional on-device OCR via `@react-native-ml-kit/text-recognition`.
2. Photo uploaded to Firebase Storage at `{barcode}/ref_{imageType}.jpg` (e.g. `ref_nutritionLabel.jpg`).
3. `onOCRSubmit` Cloud Function called with `{ barcode, ocrText, labelImageUrl, imageType }`.
4. Server-side: `parseNutritionOCR(ocrText, GEMINI_API_KEY)` refines OCR with Gemini AI and saves raw data, setting `isEditable: true`, `isIncomplete: false`.
5. Cloud Function **returns the raw product data directly** back to the client.
6. Client-side: `analyzeProduct()` is run locally on the **returned data** (saving an extra read call) and logs the scan.
7. Photo URL stored in `referenceImages[imageType]` — **not** `productImageUrl`.

**OCR correction path (existing product):**
1. User taps **"Something look wrong?"** or the incomplete-data banner in `result.tsx`
2. `scan.tsx` opens with `isUpdateMode: 'true'` + `initialBarcode` pre-filled
3. User takes photo → same OCR flow
4. `onOCRUpdate` Cloud Function called (does NOT increment scan count)
5. Merges new nutrition data into the existing `/products/{barcode}` document
6. Forces `isEditable: true`, `dataSource: 'OCR+AI'`, `isIncomplete: false`
7. Merges `referenceImages[imageType]` without replacing other reference photos
8. Returns fully updated product → `result.tsx` loads with fresh data and edit fields unlocked

### Rating System

Ratings are `A | B | C | D | E` computed by `analyzeProduct()` in `src/utils/analysisEngine.ts` (and mirrored in `functions/src/utils/`).

**Score starts at 100**, then penalties apply:
- High sugar (>5g for diabetic/PCOS, >10g for child, >15g general): -20 to -40
- High sodium (>600mg): -15 general, -40 for heart profile
- High saturated fat (>5g): -10 general, -30 for heart profile
- Harmful ingredients from `assets/data/harmfulIngredients.json`: -5 / -15 / -30 by severity

Score → Rating: ≥80=A, ≥60=B, ≥40=C, ≥20=D, else E

Rating colors: A=#2ECC71, B=#A8E063, C=#F1C40F, D=#E67E22, E=#E74C3C

### Scan Limit (Free vs Pro)

- **Free users**: `CONFIG.FREE_SCAN_LIMIT = 3` scans/day (in `src/constants/Config.ts`)
- Limit checked in `scan.tsx` via `useScanCount()` before any scan starts
- `useScanCount()` watches `/users/{uid}/scans` where `timestamp >= startOfDay(today)` in real-time
- Pro status from `useSubscription().isPro` — checked via RevenueCat entitlement `'OpenPharma Pro'`

---

## Design System (`src/theme/designSystem.ts`)

**Single source of truth** — import as `import { theme } from '../../src/theme/designSystem'`.

| Token | Value |
|-------|-------|
| Primary color | `#006d43` (dark green) |
| Primary container | `#00a86b` |
| Surface (base) | `#f7faf8` |
| Surface lowest (cards) | `#ffffff` |
| Error | `#ba1a1a` |
| Font family | `Manrope` (display, headline, body, label — all same) |
| Border radius default | `16px` |
| Border radius full | `9999` |

Spacing scale: `{1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32}`.

**Never use hardcoded color hex values** in screen files — always reference `theme.colors.*`.

---

## Authentication

Firebase Auth is used via `@react-native-firebase/auth` (native SDK, not the JS web SDK).

Supported methods:
- **Email/Password** — with mandatory email verification flow
- **Google Sign-In** — via `@react-native-google-signin/google-signin`. Web Client ID: `7881873473-rbfurd0g39fioii3uuh9unp9tnct8718.apps.googleusercontent.com`
- **Phone (SMS OTP)** — via `signInWithPhoneNumber`, default country code `+91`

On any signup, a Firestore document is created at `/users/{uid}` with minimal data. Full profile is set after `setup-profile` screen.

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-router` | `~6.0.23` | File-based navigation |
| `@react-native-firebase/*` | `^23.8.8` | Auth, Firestore, Functions, Storage |
| `react-native-purchases` | `^9.14.0` | RevenueCat SDK |
| `expo-camera` | `~17.0.10` | Barcode scanner + photo capture |
| `@react-native-ml-kit/text-recognition` | `^2.0.0` | On-device OCR |
| `expo-image-picker` | `~17.0.10` | Gallery image picker (product photo) |
| `posthog-react-native` | `^4.37.6` | Analytics |
| `@react-native-async-storage/async-storage` | `2.2.0` | Local onboarding state |
| `date-fns` | `^4.1.0` | Date formatting |
| `react-native-markdown-display` | `^7.0.2` | Render markdown in legal pages |
| `zustand` | `^5.0.12` | State library (imported but store dir is empty — not yet used) |

---

## Important Configuration Details

### `app.json` Plugins (native code generators)
- `expo-build-properties` — forces iOS static frameworks for Firebase (`useFrameworks: static`)
- `expo-camera` — injects camera permission string, disables microphone
- `@react-native-firebase/app` + `auth` — native Firebase setup
- `@react-native-google-signin/google-signin` — reversed client ID: `com.googleusercontent.apps.7881873473-b7i29gku63is5op9d5mtqgo2p3fuoc7b`
- `expo-localization` — for locale detection

### Permissions configured in `app.json`
- **iOS** (`infoPlist`): Camera, PhotoLibrary
- **Android**: CAMERA, READ/WRITE_EXTERNAL_STORAGE, VIBRATE, SYSTEM_ALERT_WINDOW, BILLING

### Firebase config files
- `google-services.json` — Android Firebase config (root of project)
- `GoogleService-Info.plist` — iOS Firebase config (root of project)

---

## Analytics (`src/utils/useAnalytics.ts`)

PostHog analytics, proxied via `https://pharma.ritom.in`. API key: `phc_IbZDwVYFWvdPa0GMzQ7BELr04LgfS4lXsMuwlPapaMC`.

Users are identified in PostHog using their Firebase `uid` via `posthog.identify(uid, properties)` in `app/_layout.tsx`. This ensures consistent tracking across app restarts and devices. `posthog.reset()` is called on logout.

Common events tracked:
- `user_signup` — `{ method: 'email' | 'phone' | 'google' }`
- `barcode_detected` — `{ barcode, format }`
- `health_profile_set` — `{ profiles_selected, age_range }`
- `onboarding_completed` — `{ profile }`
- `subscription_started` — `{ package }`
- `auth_error` — `{ method, error_code }`

---

## Known Patterns & Conventions

1. **All screens use `SafeAreaView` from `react-native-safe-area-context`** (not React Native's built-in).
2. **Stylesheet convention**: all styles are via `StyleSheet.create({...})` at the bottom of the file.
3. **No global state management** (Zustand store dir is empty); local state + hooks cover everything.
4. **Cloud Functions are called from the client via `functions().httpsCallable('functionName')(data)`** — never direct Firestore writes for business-critical ops.
5. **`isEditable` flag**: Products from OpenFoodFacts previously had `isEditable: false`, but are now set to `isEditable: true` by default to allow user corrections. Only products manually locked by admins get `isEditable: false`.
6. **`isIncomplete` flag**: Products from OpenFoodFacts where all major nutrients are 0 get `isIncomplete: true`. The result screen shows a red warning banner, and `scan.tsx` shows an alert during the barcode scan flow.
7. **`productImageUrl` vs `referenceImages`**: `productImageUrl` is ONLY set when the user explicitly picks a photo from their gallery in `result.tsx`. Nutrition label photos taken during OCR scans are stored in `product.referenceImages` (e.g. `referenceImages.nutritionLabel`) and in Firebase Storage as `{barcode}/ref_{imageType}.jpg`. They are never set as the product display image.
8. **`onOCRUpdate` vs `onOCRSubmit`**: `onOCRUpdate` is used for corrections to existing products (does not count against scan limit). `onOCRSubmit` creates a new product record. Both are triggered from `scan.tsx`, routed by the `isUpdateMode` param.
9. **Function from `app/_layout.tsx`**: `configureRevenueCat()` is called once on mount; `syncRevenueCatUser(uid)` and `posthog.identify(uid)` are called whenever the auth user changes to keep analytics and subscriptions in sync.
11. **Legal pages** (`privacy`, `tos`) navigate via root stack (not inside `(legal)` group's own stack) so the native iOS back button works correctly.
12. **Correction Banner Visibility**: The "Something look wrong?" banner in `result.tsx` appears if `product.isEditable === true` OR if `product.isIncomplete === true`. This allows users to "fix" incomplete data even for products sourced from OpenFoodFacts that are otherwise locked.
13. **Stale Cache Prevention**: All barcode lookups in `scan.tsx` use `getDocFromServer()` to ensure that updates made via Cloud Functions are immediately visible to the client upon the next scan.
