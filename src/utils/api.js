// ── URL de l'API ─────────────────────────────────────────────
const isNative = typeof window !== 'undefined' && window.Capacitor?.isNative

const isLocalhost =
  typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )

const PRODUCTION_URL = import.meta.env.VITE_API_URL || ''

export const API_URL = isLocalhost ? '' : PRODUCTION_URL
export const IS_LOCALHOST = isLocalhost

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

// ── Fetch authentifié — envoie le JWT automatiquement ────────
export function authFetch(url, options = {}) {
  const token = getToken()
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  })
}
