import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'cm.clando.app',
  appName: 'Clando',
  webDir:  'dist',

  // ── Serveur ──────────────────────────────────────────────────
  // NE PAS mettre d'URL ici en production
  // L'app charge le build local (dist/)
  // L'URL Railway est configurée dans .env via VITE_API_URL

  // Pour développement local uniquement (décommentez) :
  // server: {
  //   url: 'http://192.168.X.X:5173',
  //   cleartext: true,
  // },

  plugins: {
    SplashScreen: {
      launchShowDuration:        2000,
      launchAutoHide:            true,
      backgroundColor:           '#1A9E8A',
      androidSplashResourceName: 'splash',
      androidScaleType:          'CENTER_CROP',
      showSpinner:               false,
      splashFullScreen:          true,
      splashImmersive:           true,
      fadeInDuration:            300,
      fadeOutDuration:           300,
    },
    StatusBar: {
      style:           'DARK',
      backgroundColor: '#1A9E8A',
      overlaysWebView: false,
    },
  },

  android: {
    // HTTPS uniquement (Railway est en HTTPS) ✅
    allowMixedContent: false,
    captureInput:      true,
    webContentsDebuggingEnabled: true, // passer à false pour la release
    buildOptions: {
      releaseType: 'APK',
    },
  },
}

export default config
