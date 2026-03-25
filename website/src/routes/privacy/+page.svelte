<script lang="ts">
</script>

<div class="container legal-page">
  <div class="legal-content glass">
    <h1 class="mint-gradient">Privacy Policy</h1>
    <p class="date">Last Updated: October 2026</p>

    <div class="text-block">
      <h2>1. Introduction</h2>
      <p>
        OpenPharma ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal data is collected, used, and processed when you use our mobile application, website, and services, in strict compliance with GDPR (EU/UK), CCPA (US), and the DPDP Act 2023 (India).
      </p>

      <h2>2. Information We Collect</h2>
      <p>
        We collect account information (email address), crash logs and analytics (via PostHog), and purchase history (via RevenueCat). We DO NOT collect personal biological information or attach scanned barcode history to your individual identity for advertising. Barcode scans are anonymized.
      </p>

      <h2>3. How We Use Your Data</h2>
      <p>
        Your data is used solely to provide the OpenPharma core features (e.g., maintaining your custom health profile to flag ingredients appropriately), process subscriptions safely via RevenueCat, and improve app stability.
      </p>

      <h2>4. Data Sharing & Third Parties</h2>
      <p>
        We use Firebase (Authentication & Cloud Functions), RevenueCat (Subscriptions), and PostHog (Analytics). We do not sell your personal data to any data brokers.
      </p>

      <h2>5. User Rights (GDPR/CCPA/DPDP)</h2>
      <p>
        Depending on your region, you have the right to access, correct, or delete your personal data. You may delete your account directly inside the app under Profile -> Account Settings, which automatically purges your data from our active Google Cloud databases.
      </p>
      
      <h2>6. Contact Us</h2>
      <p>
        For privacy inquiries or to exercise your data rights, please email us directly at <a href="mailto:contact@pharma.ritom.in">contact@pharma.ritom.in</a>.
      </p>
    </div>
  </div>
</div>

<style>
  .legal-page {
    padding: 6rem 0;
  }
  
  .legal-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 4rem;
    border-radius: var(--radius-lg);
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .mint-gradient {
    background: linear-gradient(135deg, var(--primary), #6ee7b7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .date {
    color: var(--on-surface-variant);
    margin-bottom: 3rem;
    font-weight: 500;
  }

  h2 {
    font-size: 1.5rem;
    margin-top: 2.5rem;
    color: var(--on-surface);
  }

  p {
    color: var(--on-surface-variant);
    margin-bottom: 1rem;
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    .legal-content {
      padding: 2rem;
    }
    h1 {
      font-size: 2rem;
    }
  }
</style>
