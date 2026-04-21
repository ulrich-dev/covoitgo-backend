import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from '../components/mobile/BottomNav'
import { API_URL, authFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'

// ══════════════════════════════════════════════
//  MobileLayout — Layout mobile avec BottomNav
//  Remplace la Navbar desktop sur mobile
// ══════════════════════════════════════════════
export default function MobileLayout() {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  // Polling messages non lus (toutes les 30s)
  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      try {
        const res  = await authFetch(`${API_URL}/api/messages/unread/count`, {})
        const data = await res.json()
        if (data.success) setUnread(data.count || 0)
      } catch {}
    }
    fetch()
    const iv = setInterval(fetch, 30000)
    return () => clearInterval(iv)
  }, [user])

  return (
    <div style={{
      minHeight:  '100vh',
      background: '#F7F8FA',
      // Safe area pour les téléphones avec encoche
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Contenu de la page */}
      <main style={{ paddingBottom: 80 }}>
        <Outlet />
      </main>

      {/* Barre de navigation en bas */}
      <BottomNav unread={unread} />
    </div>
  )
}
