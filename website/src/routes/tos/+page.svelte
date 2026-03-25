<script lang="ts">
</script>

<div class="container legal-page">
  <div class="legal-content glass">
    <h1 class="mint-gradient">Terms of Service</h1>
    <p class="date">Last Updated: October 2026</p>

    <div class="text-block">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account and using OpenPharma, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
      </p>

      <h2>2. Medical Disclaimer (CRITICAL)</h2>
      <p>
        OpenPharma provides nutritional interpretation based on public databases (like OpenFoodFacts) and AI analysis (Google Gemini). <strong>THIS IS NOT MEDICAL ADVICE.</strong> Our health profiles (e.g., 'Diabetic', 'PCOS') are for informational filtering purposes only and should never replace consultation with a qualified healthcare provider. Do not disregard professional medical advice based on information provided by this App.
      </p>

      <h2>3. OpenPharma Pro Subscriptions</h2>
      <p>
        Subscriptions are billed on a recurring basis (monthly or annually) via RevenueCat. Your Apple ID or Google Play account will be charged at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period.
      </p>

      <h2>4. Acceptable Use Policy</h2>
      <p>
        You are granted a personal, non-transferable license to use the App. You agree not to misuse the OCR and Barcode endpoints for automated scraping, reverse engineering, distributing malware, or mass data extraction.
      </p>

      <h2>5. Limitation of Liability</h2>
      <p>
        We are not liable for inaccuracies in the retrieved nutritional data or text recognition errors resulting from blurry images. The service is provided "AS IS" and "AS AVAILABLE".
      </p>

      <h2>6. Governing Law</h2>
      <p>
        These terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
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

  strong {
    color: var(--error);
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
