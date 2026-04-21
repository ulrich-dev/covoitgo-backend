// URL du backend Railway — forcée en dur pour Android
const RAILWAY_URL = 'https://covoitgo-backend-production2.up.railway.app'

const isNative = typeof window !== 'undefined'
  && (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'android')

const isLocalhost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Sur Android ou en prod : toujours Railway
// En dev localhost : proxy Vite
export const API_URL = (isNative || !isLocalhost) ? RAILWAY_URL : ''

// ── Gestion du JWT ───────────────────────────────────────────
const TOKEN_KEY = 'cvg_token'

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ── Fetch authentifié ─────────────────────────────────────────
export function authFetch(url, options = {}) {
  const token = getToken()
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
  const credentials = isNative ? 'omit' : 'include'
  return fetch(url, { ...options, credentials, headers })
}