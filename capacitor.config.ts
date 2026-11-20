import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wpsapp.auditor',
  appName: 'WPSApp',
  webDir: 'dist',
  android: {
    backgroundColor: '#0B192C',
    allowMixedContent: false,
  },
};

export default config;
