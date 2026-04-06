import { useState, useCallback } from 'react'
import { API_URL } from '../utils/api'

export function useAdmin() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
      const data = await res.json()
      if (!data.success) setError(data.message || 'Erreur serveur.')
      return data
    } catch {
      setError('Impossible de contacter le serveur.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }, [])

  return { apiFetch, loading, error, setError }
}
