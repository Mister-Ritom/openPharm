# OpenPharma - App Store Submission Guide

## App Information
**App Name:** OpenPharma: Clinical Food Scanner
**Subtitle:** Understand what's really in your food.
**Categories:** Health & Fitness, Food & Drink

## Description
OpenPharma is your clinical companion for navigating the modern grocery store. Simply scan a barcode or snap a photo of any nutrition label, and OpenPharma cuts through the marketing BS to give you the clinical truth about your food. 

Powered by the OpenFoodFacts database and advanced Gemini AI OCR, OpenPharma delivers personalized nutritional flags based on your specific health profile (General Health, Diabetes, PCOS, Heart Guard, and more).

**Key Features:**
- Instant Barcode Scanning for millions of products.
- AI OCR Label parsing if a product isn't currently in our database or if existing data is incomplete.
- A "Something look wrong?" correction flow that allows users to instantly override incorrect or missing data with a fresh photo scan.
- Traffic Light clinical ratings (A-E) to easily tell if a product is healthy.
- Customizable Health Profiles to see specifically what impacts YOU.
- OpenPharma Pro layer for unlimited, ad-free access to advanced analytics.

## Privacy & Data Usage
- **Data Collection:** Email addresses (via Firebase Auth) and crash data (PostHog). Standard tracking usage. 
- **Anonymization:** We do not attach Barcode Scans or OCR photos to PII.
- **Privacy Policy URL:** `https://pharma.ritom.in/privacy`
- **Support URL:** `https://pharma.ritom.in/`

## Keywords
food scanner, nutrition app, health scanner, diabetic diet, pcos diet, calorie counter, barcode scanner, healthy eating, clinical nutrition, grocery scanner

## Reviewer Notes
- Please use the test account `test-reviewer@pharma.ritom.in` (pw: `OpenPharma123!`) to bypass real-world rate limiting on the OCR endpoint.
- To test the In-App Purchases, please use the Apple/Google Sandbox environments. All products are configured in RevenueCat.

## Required Assets
- `app_icon_1024.png` (Included in `/assets`)
- 5x Screenshots (iPhone 6.5" Display) using real app footage.
- 5x Screenshots (Android 1080x1920) 
