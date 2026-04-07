# 🟢 OpenPharma

> **Scan a barcode. Know what you're eating. Stay safe.**

OpenPharma is an open-source React Native / Expo app that lets you scan packaged food barcodes or photograph nutrition labels to get a **personalized health safety rating** — tailored to conditions like diabetes, PCOS, heart disease, and more.

---

## ✨ What It Does

- 📷 **Barcode Scan** — Instantly look up any packaged food product
- 🔬 **OCR Label Scan** — Photograph a nutrition label and let AI parse it
- 🧠 **Personalized Ratings** — Grades from A–E based on *your* health profile
- ⚠️ **Harmful Ingredient Warnings** — Flags additives, preservatives, and more
- 📜 **Scan History** — Review everything you've scanned
- 💊 **Health Profiles** — Diabetic, PCOS, heart patient, child, general, and more

---

## 📸 Tech Stack

| Layer | Tech |
|---|---|
| Framework | React Native + Expo SDK 54 (New Architecture) |
| Routing | Expo Router (file-based) |
| Auth | Firebase Auth (Email, Google, Phone OTP) |
| Database | Cloud Firestore |
| AI / OCR | Google Gemini Flash Lite (Structured Outputs) |
| On-device OCR | ML Kit Text Recognition |
| Subscriptions | RevenueCat |
| Analytics | PostHog (self-hosted) |
| Backend | Firebase Cloud Functions (Node.js/TypeScript) |
| Product Data | Open Food Facts API |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A **Firebase project** of your own (see below)
- A **RevenueCat** account (optional, for subscription features)

### Installation

```bash
git clone https://github.com/your-username/openPharm.git
cd openPharm
npm install
```

### Firebase Setup

This project ships **without** any Firebase credentials. You need to bring your own:

1. Create a new project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password, Google, Phone)
3. Enable **Cloud Firestore**
4. Enable **Firebase Storage**
5. Enable **Cloud Functions** (Blaze plan required)
6. Download your config files and place them at the project root:
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
7. Update `app.json` with your own reversed client ID for Google Sign-In

> ⚠️ **Do not use my Firebase project.** The original backend has been shut down. You must set up your own.

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS (Mac required)
npx expo run:ios
```

---

## 📁 Project Structure

```
openPharm/
├── app/                    # Screens (Expo Router file-based routing)
│   ├── _layout.tsx         # Root layout — auth guard + navigation
│   ├── paywall.tsx         # RevenueCat paywall modal
│   ├── (onboarding)/       # 4-step onboarding carousel
│   ├── (auth)/             # Signup, Login, Verify Email, Setup Profile
│   ├── (main)/             # Authenticated tab app (Home, Scan, History, Profile)
│   └── (legal)/            # Privacy Policy & Terms of Service
│
├── src/
│   ├── context/            # React Contexts (Onboarding)
│   ├── hooks/              # useAuth, useScanCount, useSubscription
│   ├── utils/              # analysisEngine.ts, ocrParser.ts, analytics
│   ├── components/ui/      # Button, Card, RatingBadge, ScanLimitSheet, etc.
│   ├── constants/          # Config (FREE_SCAN_LIMIT), AdMob IDs
│   └── theme/              # designSystem.ts — colors, fonts, spacing
│
├── functions/              # Firebase Cloud Functions
│   └── src/
│       ├── index.ts        # All function exports
│       └── utils/          # Server-side analysisEngine + ocrParser
│
└── assets/
    └── data/
        └── harmfulIngredients.json   # Bundled ingredient blacklist
```

---

## 🧮 Rating System

Ratings are computed **on-device** by `src/utils/analysisEngine.ts`. Scores start at 100 and penalties are applied based on nutrients and ingredients:

| Condition | Penalty Trigger | Deduction |
|---|---|---|
| High sugar (diabetic/PCOS) | >5g | −20 to −40 |
| High sodium | >600mg | −15 (−40 for heart) |
| High saturated fat | >5g | −10 (−30 for heart) |
| Harmful ingredient (low) | — | −5 |
| Harmful ingredient (medium) | — | −15 |
| Harmful ingredient (high) | — | −30 |

| Score | Grade |
|---|---|
| ≥ 80 | 🟢 A |
| ≥ 60 | 🟡 B |
| ≥ 40 | 🟠 C |
| ≥ 20 | 🔴 D |
| < 20 | ⛔ E |

---

## 💰 Monetization (for your own deployment)

The app is built with a **free tier + Pro subscription** model:

- **Free**: 3 scans/day, non-intrusive native ads in history feed
- **Pro**: Unlimited scans, completely ad-free experience

If you self-host this, you can configure your own RevenueCat products and AdMob unit IDs in `src/constants/`.

---

## 🛑 Project Status

> **Discontinued** — The original app was submitted to the Google Play Store but was rejected because it requires an **organization developer account**, which I don't have. The Play Console only accepts personal accounts for certain categories, and this app didn't qualify.

The app itself is fully functional. This repo is now open to the community — feel free to fork it, self-host it, or take it wherever you'd like.

---

## 🤝 Contributing

Contributions are very welcome! Whether it's:

- 🐛 Bug fixes
- 🌍 Adding new health profiles or ingredient data
- 🎨 UI improvements
- 📦 Adding new product data sources
- 🌐 Localization

Please open an issue or pull request. There's no formal contribution guide yet — just be respectful and write clean code.

---

## 📄 License

This project is free to use for anyone. You're welcome to fork, self-host, or build on top of it.

**You may not** reuse the original Firebase backend (`me.ritom.openpharm`) — it has been shut down anyway. Set up your own Firebase project as described above.

---

## 👤 Author

Made by **Ritom** — [ritom.in](https://ritom.in)

If you find this useful or end up building something with it, I'd love to hear about it.
