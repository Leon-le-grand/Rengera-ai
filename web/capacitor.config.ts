import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'rw.rengera.ai',
  appName: 'Rengera',
  webDir: 'out',
  server: {
    // The app is a live Next.js site, not a static bundle, so the WebView
    // loads the deployed server. Server actions, Supabase and the AI provider
    // all work unchanged; no secrets live in the APK.
    url: 'https://rengera-ai.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2200,
      launchAutoHide: true,
      backgroundColor: '#09090b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;