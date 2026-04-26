// ══════════════════════════════════════════════════════════════
//  useGoogleAuth — Google Sign-In adaptatif
//
//  Mobile (Capacitor Android) : utilise @codetrix-studio/capacitor-google-auth
//    → ouvre le sélecteur de compte Google natif
//    → retourne un idToken
//    → on envoie le token au backend pour vérification
//
//  Web : redirige vers /api/auth/google (Passport.js classique)
// ══════════════════════════════════════════════════════════════

import { API_URL, saveToken } from '../utils/api'

export function useGoogleAuth() {

  const signInWithGoogle = async () => {
    const isNative = typeof window !== 'undefined' &&
      (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'android')

    if (isNative) {
      return signInNative()
    } else {
      return signInWeb()
    }
  }

  // ── Android natif ─────────────────────────────────────────
  const signInNative = async () => {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')

      // Initialiser si pas déjà fait
      await GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      })

      const result = await GoogleAuth.signIn()

      // Récupérer le idToken
      const idToken = result.authentication?.idToken
      if (!idToken) throw new Error('Aucun token Google reçu')

      // Envoyer au backend pour vérification et création de compte
      const res  = await fetch(`${API_URL}/api/auth/google-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()

      if (data.success && data.token) {
        saveToken(data.token)
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.message || 'Erreur de connexion Google' }
      }
    } catch (err) {
      console.error('Google Sign-In natif:', err)
      if (err.message?.includes('cancelled') || err.message?.includes('12501')) {
        return { success: false, error: 'Connexion annulée', cancelled: true }
      }
      return { success: false, error: err.message || 'Erreur Google Sign-In' }
    }
  }

  // ── Web — redirection classique ───────────────────────────
  const signInWeb = () => {
    window.location.href = `${API_URL}/api/auth/google`
    return new Promise(() => {}) // jamais résolue, page se recharge
  }

  // ── Déconnexion ──────────────────────────────────────────
  const signOut = async () => {
    const isNative = typeof window !== 'undefined' &&
      (window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'android')
    if (isNative) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
        await GoogleAuth.signOut()
      } catch {}
    }
  }

  return { signInWithGoogle, signOut }
}
