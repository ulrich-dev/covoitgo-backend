// ── URL de l'API ───────────────────────────────────────────────
//
// • Navigateur web (dev)  : API_URL = '' (proxy Vite → localhost:5000)
// • App Android Capacitor : API_URL = URL de votre backend en ligne
//                           (l'app ne peut pas appeler localhost)
//
// Capacitor expose window.Capacitor sur l'app native.
// En web, window.Capacitor est undefined → on utilise le proxy Vite.
//
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNative

// ⚠️  REMPLACEZ par votre URL de production avant de builder l'APK
const PRODUCTION_URL = import.meta.env.VITE_API_URL || 'https://api.covoitgo.cm'

export const API_URL = isNative ? PRODUCTION_URL : ''

export const IS_LOCALHOST =
  !isNative && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
