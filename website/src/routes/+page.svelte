<script lang="ts">
  // Home page script
</script>

<section class="hero">
  <div class="hero-bg-glow"></div>
  <div class="container hero-content">
    <div class="hero-text">
      <div class="badge">Introducing OpenPharma Pro</div>
      <h1 class="hero-title">Scan the Label.<br/><span class="mint-gradient">Know the Truth.</span></h1>
      <p class="hero-subtitle">
        Your pocket clinical nutritionist. We use advanced OCR and global databases to strip away marketing jargon, giving you the raw, personalized truth about your food.
      </p>
      <div class="hero-actions">
        <a href="#download" class="button">Download App</a>
        <a href="#features" class="button button-secondary">Learn More</a>
      </div>
    </div>
    <div class="hero-visual">
      <!-- Mockup representation, in reality we'd use a real asset -->
      <div class="phone-mockup glass">
        <div class="mockup-header">
          <div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>
        </div>
        <div class="mockup-body">
          <div class="shimmer-line"></div>
          <div class="shimmer-block"></div>
          <div class="shimmer-line short"></div>
          <div class="scan-overlay"></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="features" class="features-section">
  <div class="container">
    <h2 class="section-title text-center">Uncompromising Food Transparency</h2>
    <div class="feature-grid">
      <div class="feature-card glass">
        <div class="icon-wrapper">📟</div>
        <h3>Universal Scanning</h3>
        <p>If it has a barcode or a nutrition label, we can read it. Never guess what you're eating again.</p>
      </div>
      <div class="feature-card glass">
        <div class="icon-wrapper">🧬</div>
        <h3>Clinical Personalization</h3>
        <p>Select tailored profiles like PCOS, Diabetic, or Heart Health to filter out ingredients that impact YOU.</p>
      </div>
      <div class="feature-card glass">
        <div class="icon-wrapper">🤖</div>
        <h3>Gemini-Powered OCR</h3>
        <p>Missing from the database? Snap a photo of the label and our advanced AI reads the raw ingredients instantly.</p>
      </div>
    </div>
  </div>
</section>

<section id="reviews" class="reviews-section">
  <div class="container">
    <h2 class="section-title text-center">What Explorers Say</h2>
    <div class="review-grid">
      <div class="review-card glass">
        <div class="stars">★★★★★</div>
        <p class="review-text">"As a diabetic, this app has changed how I grocery shop. I don't have to squint at tiny labels anymore."</p>
        <p class="review-author">— Sarah T.</p>
      </div>
      <div class="review-card glass">
        <div class="stars">★★★★★</div>
        <p class="review-text">"The OCR fallback is genius. Even obscure local brands get analyzed in seconds. Stunning design too."</p>
        <p class="review-author">— Michael P.</p>
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    padding: 8rem 0 6rem;
    overflow: hidden;
  }

  .hero-bg-glow {
    position: absolute;
    top: -20%;
    right: -20%;
    width: 60vw;
    height: 60vw;
    background: radial-gradient(circle, var(--primary-glow) 0%, transparent 60%);
    z-index: -1;
    filter: blur(80px);
  }

  .hero-content {
    display: flex;
    align-items: center;
    gap: 4rem;
  }

  .hero-text {
    flex: 1;
  }

  .badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--surface-elevated);
    border: 1px solid var(--outline);
    border-radius: 100px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--on-surface-variant);
    margin-bottom: 1.5rem;
  }

  .hero-title {
    font-size: 4rem;
    letter-spacing: -1.5px;
    margin-bottom: 1.5rem;
  }

  .mint-gradient {
    background: linear-gradient(135deg, var(--primary), #6ee7b7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--on-surface-variant);
    margin-bottom: 2.5rem;
    max-width: 500px;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
  }

  .hero-visual {
    flex: 1;
    display: flex;
    justify-content: center;
    position: relative;
  }

  /* Mockup Animation */
  .phone-mockup {
    width: 300px;
    height: 600px;
    border-radius: 40px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    border: 4px solid var(--outline);
    position: relative;
    overflow: hidden;
  }

  .mockup-header {
    display: flex;
    gap: 6px;
    margin-bottom: 2rem;
  }

  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }

  .mockup-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
  }

  .shimmer-line {
    height: 12px;
    background: var(--surface-elevated);
    border-radius: 6px;
    width: 80%;
  }
  .short { width: 50%; }
  .shimmer-block {
    height: 200px;
    background: var(--surface-elevated);
    border-radius: var(--radius-md);
  }

  .scan-overlay {
    position: absolute;
    top: 50px;
    left: 10%;
    width: 80%;
    height: 2px;
    background: var(--primary);
    box-shadow: 0 0 10px var(--primary);
    animation: scan 3s ease-in-out infinite alternate;
  }

  @keyframes scan {
    0% { top: 50px; }
    100% { top: 250px; }
  }

  .features-section, .reviews-section {
    padding: 6rem 0;
  }

  .section-title {
    font-size: 2.5rem;
    margin-bottom: 3rem;
  }
  
  .text-center { text-align: center; }

  .feature-grid, .review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .feature-card, .review-card {
    padding: 2.5rem;
    border-radius: var(--radius-lg);
    transition: transform 0.3s ease;
  }

  .feature-card:hover, .review-card:hover {
    transform: translateY(-5px);
  }

  .icon-wrapper {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
  }

  .feature-card h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .feature-card p, .review-text {
    color: var(--on-surface-variant);
  }

  .stars {
    color: var(--primary);
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .review-text {
    font-style: italic;
    margin-bottom: 1.5rem;
  }

  .review-author {
    font-weight: 700;
  }

  @media (max-width: 900px) {
    .hero-content {
      flex-direction: column;
      text-align: center;
    }
    .hero-title {
      font-size: 3rem;
    }
    .hero-subtitle {
      margin: 0 auto 2.5rem;
    }
    .hero-actions {
      justify-content: center;
    }
    .hero-visual {
      display: none; /* Hide mockup on mobile for simplicity */
    }
  }
</style>
