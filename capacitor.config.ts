import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taller.app',
  appName: 'Sistema Taller Piolin',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  // Configuración específica para Android
  android: {
    // Permitir que el WebView sea transparente para el barcode scanner
    backgroundColor: '#00000000', // Transparente cuando sea necesario
    allowMixedContent: true
  },
  plugins: {
    // Configuración del plugin de barcode scanner
    BarcodeScanner: {
      // El plugin necesita que el WebView sea transparente temporalmente
    }
  }
};

export default config;