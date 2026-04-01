<script lang="ts">
  import '../app.css';
</script>

<svelte:head>
  <title>OpenPharma | Clinical Food Transparency</title>
  <meta name="description" content="Scan barcodes, upload nutrition labels, and get instant clinical insights tailored exactly to your health profile.">
</svelte:head>

<header class="navbar glass">
  <div class="container nav-container">
    <a href="/" class="logo">
      <span class="mint">Open</span>Pharma
    </a>
    <nav class="nav-links">
      <a href="/#features">Features</a>
      <a href="/#reviews">Reviews</a>
      <a href="/privacy">Privacy</a>
      <a href="/tos">Terms</a>
    </nav>
    <a href="#download" class="button">Download App</a>
  </div>
</header>

<main>
  <slot />
</main>

<footer class="footer">
  <div class="container footer-content">
    <div class="footer-brand">
      <span class="logo-text"><span class="mint">Open</span>Pharma</span>
      <p>Independent, clinical food transparency. Empowering your dietary choices.</p>
    </div>
    <div class="footer-links">
      <a href="/privacy">Privacy Policy</a>
      <a href="/tos">Terms of Service</a>
      <a href="/delete-account">Request Account Deletion</a>
      <a href="mailto:ritomghosh856@gmail.com">ritomghosh856@gmail.com</a>
    </div>
  </div>
  <div class="container copyright">
    &copy; {new Date().getFullYear()} OpenPharma. All rights reserved.
  </div>
</footer>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 1rem 0;
  }
  
  .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--on-surface);
  }

  .mint {
    color: var(--primary);
  }

  .nav-links {
    display: flex;
    gap: 2rem;
  }

  .nav-links a {
    color: var(--on-surface-variant);
    font-weight: 500;
  }

  .nav-links a:hover {
    color: var(--primary);
  }

  main {
    flex: 1;
    padding-top: 80px; /* Offset for fixed navbar */
  }

  .footer {
    background: var(--surface-elevated);
    border-top: 1px solid var(--outline);
    padding: 4rem 0 2rem;
    margin-top: 6rem;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .logo-text {
    font-size: 1.25rem;
    font-weight: 800;
    display: block;
    margin-bottom: 0.5rem;
  }

  .footer-brand p {
    color: var(--on-surface-variant);
    max-width: 300px;
  }

  .footer-links {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .copyright {
    border-top: 1px solid var(--outline);
    padding-top: 2rem;
    color: var(--on-surface-variant);
    font-size: 0.875rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    .nav-links {
      display: none;
    }
    .footer-content {
      flex-direction: column;
    }
  }
</style>
