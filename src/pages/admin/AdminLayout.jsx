import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { API_URL, authFetch } from '../../utils/api'

const NAV = [
  { path: '/admin',          icon: '📊', label: 'Dashboard'     },
  { path: '/admin/users',    icon: '👥', label: 'Utilisateurs'  },
  { path: '/admin/trips',    icon: '🚗', label: 'Trajets'        },
  { path: '/admin/bookings', icon: '🎫', label: 'Réservations'  },
  { path: '/admin/contacts', icon: '📩', label: 'Messages'      },
  { path: '/admin/debtors',  icon: '💰', label: 'Paiements'     },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()
  const [isAdmin, setIsAdmin] = useState(null) // null=loading, false=denied, true=ok
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    authFetch(`${API_URL}/api/admin/me`, {})
      .then(r => r.json())
      .then(d => { if (d.success && d.user?.is_admin) setIsAdmin(true); else setIsAdmin(false) })
      .catch(() => setIsAdmin(false))
  }, [])

  if (isAdmin === null) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
      <div style={{ color: '#fff', fontSize: 14, opacity: .6 }}>Vérification des accès…</div>
    </div>
  )

  if (isAdmin === false) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Accès refusé</div>
      <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Vous devez être administrateur.</div>
      <Link to="/" style={{ marginTop: 8, background: '#1A9E8A', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
        ← Retour à l'accueil
      </Link>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ══ Sidebar ══ */}
      <aside style={{
        width: collapsed ? 68 : 240, flexShrink: 0,
        background: '#0F172A', display: 'flex', flexDirection: 'column',
        transition: 'width .22s ease', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>

        {/* Logo */}
        <div style={{ padding: collapsed ? '20px 0' : '22px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.07)', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🚗</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: '-.01em' }}>Clando</div>
              <div style={{ color: '#1A9E8A', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Admin</div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(item => {
            const active = item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path)
            return (
              <Link key={item.path} to={item.path}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: collapsed ? '10px 0' : '10px 14px',
                  borderRadius: 10, textDecoration: 'none',
                  background: active ? 'rgba(26,158,138,.18)' : 'transparent',
                  border: active ? '1px solid rgba(26,158,138,.3)' : '1px solid transparent',
                  color: active ? '#22C6AD' : 'rgba(255,255,255,.55)',
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  transition: 'all .15s',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            )
          })}
        </nav>

        {/* User + collapse */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'rgba(255,255,255,.05)', borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
                {user?.first_name?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ color: '#1A9E8A', fontSize: 10, fontWeight: 700 }}>Administrateur</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: collapsed ? 'center' : 'flex-end' }}>
            <Link to="/" title="Voir le site" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, textDecoration: 'none', cursor: 'pointer' }}>🏠</Link>
            <button onClick={() => setCollapsed(v => !v)}
              title={collapsed ? 'Développer' : 'Réduire'}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: 'none', cursor: 'pointer', fontSize: 14, color: 'rgba(255,255,255,.5)' }}>
              {collapsed ? '→' : '←'}
            </button>
          </div>
        </div>
      </aside>

      {/* ══ Main content ══ */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>
            {NAV.find(n => n.path === location.pathname)?.label || 'Administration'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <button onClick={async () => { await logout(); navigate('/login') }}
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Déconnexion
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
