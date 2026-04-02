# OpenPharma — Website Context

> **For AI agents**: This file describes the OpenPharma landing page and web presence. After making changes to the website, update this file to reflect new routes, features, or deployment configurations.

---

## Overview

The **OpenPharma Website** is a lightweight landing page and legal document host built with **SvelteKit**. It serves as the primary web presence for the app and provides the required links for app store submissions (Privacy Policy, Terms of Service, and Account Deletion).

- **Domain**: `pharma.ritom.in`
- **Framework**: SvelteKit 2 + Svelte 5 (Runes mode)
- **Build Tool**: Vite 7
- **Project Directory**: `/website`
- **Hosting**: Firebase Hosting (Static)

---

## Repository Structure

```
website/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte      # Common layout (Navbar, Footer)
│   │   ├── +page.svelte        # Main landing page
│   │   ├── privacy/
│   │   │   └── +page.svelte    # Privacy Policy page
│   │   ├── tos/
│   │   │   └── +page.svelte    # Terms of Service page
│   │   └── delete-account/
│   │       └── +page.svelte    # Account Deletion Request page
│   ├── lib/                    # Reusable Svelte components and utilities
│   ├── app.css                 # Global styles (Vanilla CSS)
│   ├── app.html                # Main HTML entry point
│   └── app.d.ts                # TypeScript declarations
├── static/                     # Static assets (images, icons, etc.)
├── svelte.config.js            # SvelteKit configuration (adapter-static)
├── vite.config.ts              # Vite configuration
└── package.json                # Dependencies and scripts
```

---

## Key Features

1. **Landing Page**: A high-conversion landing page detailing the app's features (Barcode scanning, AI analysis, Clinical Personalization).
2. **Legal Pages**: Mandatory `/privacy` and `/tos` pages for App Store and Play Store compliance.
3. **Data Control**: A dedicated `/delete-account` route for users to request data removal, fulfilling platform requirements.
4. **Analytics**: Integrated with PostHog (shared with the mobile app) for unified user tracking.

---

## Deployment

The website is deployed to **Firebase Hosting** as a Static Site.

### Build Process
The project uses `@sveltejs/adapter-static` to generate a production build in the `website/build` directory.

### Hosting Configuration
Firebase is configured in the root `firebase.json` to serve the `website/build` directory:
- **Clean URLs**: Enabled.
- **SPA Fallback**: All requests are rewritten to `/index.html` (or `404.html` fallback) to handle SvelteKit client-side routing.
- **AASA/AssetLinks**: Specific headers are set for Apple and Android app association files in `.well-known/`.

### Available Scripts

- `npm run dev`: Start a local development server.
- `npm run build`: Create a production build of the website.
- `npm run preview`: Preview the production build locally.
- `npm run check`: Run Svelte-check for TypeScript and Svelte diagnostics.

---

## Interaction with Mobile App

- **Deep Linking**: Hosts `apple-app-site-association` and `.well-known/assetlinks.json` in the `static/` directory for Universal Links and App Links.
- **Legal Compliance**: The mobile app links directly to `/privacy`, `/tos`, and `/delete-account` within its legal and profile settings.
- **Shared Analytics**: Uses the same PostHog instance as the mobile app to maintain a single view of the user journey.

