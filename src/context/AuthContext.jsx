import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { API_URL, saveToken, getToken, clearToken, authFetch } from '../utils/api'

const AuthContext = createContext(null)

let _onLangSync = null
export const registerLangSync = (fn) => { _onLangSync = fn }

// ── Fetch JSON avec JWT ───────────────────────────────────────
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken()
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  return res.json()
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimer          = useRef(null)

  const syncLang = useCallback((userData) => {
    if (userData?.language && _onLangSync) _onLangSync(userData.language)
  }, [])

  // Refresh auto toutes les 45min (token valide 3h)
  const startRefresh = useCallback((u) => {
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    if (!u) return
    refreshTimer.current = setInterval(async () => {
      try {
        const data = await apiFetch('/api/auth/me')
        if (data.success) {
          setUser(data.user)
          syncLang(data.user)
        } else {
          clearToken()
          setUser(null)
          clearInterval(refreshTimer.current)
        }
      } catch {}
    }, 45 * 60 * 1000)
  }, [syncLang])

  // Restaurer la session au chargement
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    apiFetch('/api/auth/me')
      .then(data => {
        if (data.success) {
          setUser(data.user)
          syncLang(data.user)
          startRefresh(data.user)
        } else {
          clearToken()
        }
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false))

    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [syncLang, startRefresh])

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
    if (data.success) {
      if (data.token) saveToken(data.token)
      setUser(data.user)
      syncLang(data.user)
      startRefresh(data.user)
    }
    return data
  }

  const register = async (formData) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        password:  formData.password,
        birthDate: formData.birthDate || undefined,
        phone:     formData.phone     || undefined,
        role:      formData.role      || 'both',
        bio:       formData.bio       || undefined,
        language:  formData.language  || localStorage.getItem('cvg_lang') || 'en',
      },
    })
    return data
  }

  const logout = async () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    clearToken()
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  const fetchMe = async () => {
    try {
      const data = await apiFetch('/api/auth/me')
      if (data.success) {
        if (data.token) saveToken(data.token)
        setUser(data.user)
        syncLang(data.user)
        startRefresh(data.user)
        return data.user
      } else {
        clearToken()
      }
    } catch {}
    return null
  }

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fafaf7' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16, display:'inline-block', animation:'spin 1s linear infinite' }}>🚗</div>
        <p style={{ color:'#6b635c', fontSize:14 }}>Chargement…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
