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

export default config;
