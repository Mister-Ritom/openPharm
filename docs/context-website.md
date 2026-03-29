# OpenPharma — Website Context

> **For AI agents**: This file describes the OpenPharma landing page and web presence. After making changes to the website, update this file to reflect new routes, features, or deployment configurations.

---

## Overview

The **OpenPharma Website** is a lightweight landing page and legal document host built with **SvelteKit**. It serves as the primary web presence for the app and provides the required links for app store submissions (Privacy Policy and Terms of Service).

- **Domain**: `pharma.ritom.in`
- **Framework**: SvelteKit 2 + Svelte 5
- **Build Tool**: Vite 7
- **Project Directory**: `/website`

---

## Repository Structure

```
website/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte      # Common layout (Navbar, Footer, PostHog init)
│   │   ├── +page.svelte        # Main landing page
│   │   ├── privacy/
│   │   │   └── +page.svelte    # Privacy Policy page
│   │   └── tos/
│   │       └── +page.svelte    # Terms of Service page
│   ├── lib/                    # Reusable Svelte components and utilities
│   ├── app.css                 # Global styles (Vanilla CSS / Tailwind if requested)
│   ├── app.html                # Main HTML entry point
│   └── app.d.ts                # TypeScript declarations
├── static/                     # Static assets (images, icons, etc.)
├── svelte.config.js            # SvelteKit configuration
├── vite.config.ts              # Vite configuration
└── package.json                # Dependencies and scripts
```

---

## Key Features

1. **Landing Page**: A high-conversion landing page detailing the app's features (Barcode scanning, AI analysis, Health profiles).
2. **Legal Pages**: Mandatory `/privacy` and `/tos` pages for App Store and Play Store compliance.
3. **Analytics**: Integrated with PostHog (shared with the mobile app) via the associated domain proxy.

---

## Deployment

The website is typically deployed via **Vercel** or **Cloudflare Pages** (using `@sveltejs/adapter-auto`).

### Available Scripts

- `npm run dev`: Start a local development server.
- `npm run build`: Create a production build of the website.
- `npm run preview`: Preview the production build locally.
- `npm run check`: Run Svelte-check for TypeScript and Svelte diagnostics.

---

## Interaction with Mobile App

- The website provides the link for the app's **associated domains** (iOS Universal Links / Android App Links).
- It hosts the `apple-app-site-association` and `.well-known/assetlinks.json` files if deep linking is configured via the web server (typically these are placed in the `static/.well-known/` directory).
- The mobile app links to the website's `/privacy` and `/tos` pages within the `(legal)` route group.
