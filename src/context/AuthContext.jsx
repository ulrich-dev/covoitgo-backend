import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_URL } from '../utils/api'

const AuthContext = createContext(null)

// Callback global pour synchroniser la langue avec le compte utilisateur
let _onLangSync = null
export const registerLangSync = (fn) => { _onLangSync = fn }

const apiFetch = async (endpoint, options = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  return res.json()
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // Synchronise la langue du compte avec le LangContext
  const syncLang = useCallback((userData) => {
    if (userData?.language && _onLangSync) {
      _onLangSync(userData.language)
    }
  }, [])

  // Restaure la session au chargement
  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(data => {
        if (data.success) {
          setUser(data.user)
          syncLang(data.user)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [syncLang])

  const login = async (email, password) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
    if (data.success) {
      setUser(data.user)
      syncLang(data.user)
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
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  const fetchMe = async () => {
    try {
      const data = await apiFetch('/api/auth/me')
      if (data.success) {
        setUser(data.user)
        syncLang(data.user)
        return data.user
      }
    } catch {}
    return null
  }

  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fafaf7' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16, display:'inline-block', animation:'spin 1s linear infinite' }}>🚗</div>
        <p style={{ color:'#6b635c', fontSize:14 }}>Loading…</p>
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
