// ── URL de l'API ─────────────────────────────────────────────
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNative

const isLocalhost =
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )

const PRODUCTION_URL = import.meta.env.VITE_API_URL || ''

// En local  → '' (proxy Vite)
// En prod   → URL Railway depuis VITE_API_URL
// Sur Android → URL Railway depuis VITE_API_URL
export const API_URL = isLocalhost ? '' : PRODUCTION_URL

export const IS_LOCALHOST = isLocalhost
