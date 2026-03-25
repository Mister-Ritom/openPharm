// Extracting tokens from stitch design/clinical_mint/DESIGN.md

export const theme = {
  colors: {
    // Primary & Secondary: "Trust Anchors"
    primary: '#006d43',
    primaryContainer: '#00a86b',
    onPrimary: '#ffffff',
    
    secondary: '#006b5a',
    secondaryFixedDim: '#75d8c1',

    tertiary: '#1b6d24',
    
    // Surface Hierarchy (No-Line rule)
    surface: '#f7faf8',               // Base Layer
    surfaceContainerLow: '#f1f4f2',   // Sections layer
    surfaceContainer: '#ebefed',      // Background default layer
    surfaceContainerHighest: '#e0e3e1', // Input fill
    surfaceContainerLowest: '#ffffff',  // Active cards
    
    onSurface: '#181c1b',
    onSurfaceVariant: '#3d4a41',
    outline: '#737974',
    outlineVariant: '#bccabe',        // Ghost borders (use at 15% opacity)
    onPrimaryContainer: '#002111',
    
    error: '#ba1a1a',
    
    // Semantic States for Ratings
    rating: {
      A: '#2ECC71', // green
      B: '#A8E063', // lime
      C: '#F1C40F', // yellow
      D: '#E67E22', // orange
      E: '#E74C3C', // red
    }
  },
  typography: {
    fontFamily: {
      display: 'Manrope',
      headline: 'Manrope',
      body: 'Manrope',
      label: 'Manrope',
    },
    // Hierarchy: Bold Headline + Regular Body
    sizes: {
      displayLg: 56, // 3.5rem - sparingly
      displayMd: 44,
      displaySm: 36,
      headlineMd: 28,
      headlineSm: 24, // 1.5rem - workhorse
      bodyLg: 16, // 1rem - descriptions
      bodyMd: 14,
      bodySm: 12,
      labelMd: 14,
    }
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    // Asymmetric Layout Utility
    asymmetricLeft: 44, // 2.75rem
    asymmetricRight: 22, // 1.4rem
  },
  rounding: {
    default: 16, // 1rem
    lg: 24, // 1.5rem
    xl: 32,
    full: 9999,
  },
  shadows: {
    ambient: '0px 12px 32px rgba(24, 28, 27, 0.06)', // Floating FABs/Modals
    cardStack: '0px 4px 8px rgba(0, 0, 0, 0.02)',    // Tonal Layering
  }
};
