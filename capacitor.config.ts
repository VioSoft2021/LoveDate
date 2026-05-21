import type { CapacitorConfig } from '@capacitor/cli';

// Allow an explicit dev server URL when launching the native app so the
// Android WebView can load the Vite dev server (useful for testing).
// Set the env var `CAPACITOR_SERVER_URL` to e.g. "http://192.168.43.110:5173"
// before running `npx cap run android` to enable live dev mode on device.
const devServerUrl = process.env.CAPACITOR_SERVER_URL
const devServer: CapacitorConfig['server'] =
  devServerUrl && devServerUrl.length > 0
    ? { url: devServerUrl, cleartext: true }
    : undefined

const config: CapacitorConfig = {
  // appId stays as com.lovedate.app on purpose — changing the bundle
  // identifier orphans all existing PWA installs on devices. The
  // user-visible name is what flips to Privé.
  appId: 'com.lovedate.app',
  appName: 'Privé',
  webDir: 'dist',
  backgroundColor: '#0a0e27',
  ...(devServer ? { server: devServer } : {}),
  android: {
    backgroundColor: '#0a0e27',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0a0e27',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0e27',
      overlaysWebView: false,
    },
  },
};

export default config;
