import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovedate.app',
  appName: 'LoveDate',
  webDir: 'dist',
  backgroundColor: '#141937',
  android: {
    backgroundColor: '#141937',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#141937',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#141937',
      overlaysWebView: false,
    },
  },
};
// Allow an explicit dev server URL when launching the native app so the
// Android WebView can load the Vite dev server (useful for testing).
// Set the env var `CAPACITOR_SERVER_URL` to e.g. "http://192.168.43.110:5173"
// before running `npx cap run android` to enable live dev mode on device.
const devServerUrl = process.env.CAPACITOR_SERVER_URL
if (devServerUrl && devServerUrl.length > 0) {
  ;(config as any).server = { url: devServerUrl, cleartext: true }
}

export default config;
