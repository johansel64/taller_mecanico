import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taller.app',
  appName: 'Sistema Taller Piolin',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;