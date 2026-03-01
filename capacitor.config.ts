import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coupleclarity.app',
  appName: 'CoupleClarity',
  webDir: 'dist/public',
  server: {
    // Allow mixed content & cross-origin requests from native shell
    allowNavigation: ['coupleclarity-v0uy.onrender.com'],
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#FAFAFA',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
