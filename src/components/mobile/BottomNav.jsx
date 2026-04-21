import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { API_URL } from '../../utils/api'

// ══════════════════════════════════════════════
//  BottomNav — Barre de navigation mobile
//  Style BlaBlaCar avec 5 onglets
// ══════════════════════════════════════════════

const TABS = [
  {
    to:    '/search',
    icon:  SearchIcon,
    label: 'Rechercher',
    match: (p) => p.startsWith('/search'),
  },
  {
    to:    '/publish',
    icon:  PlusIcon,
    label: 'Publier',
    match: (p) => p.startsWith('/publish'),
  },
  {
    to:    '/my-trips',
    icon:  TicketIcon,
    label: 'Mes trajets',
    match: (p) => p.startsWith('/my-trips'),
  },
  {
    to:    '/messages',
    icon:  ChatIcon,
    label: 'Messages',
    match: (p) => p.startsWith('/messages'),
  },
  {
    to:    '/profile',
    icon:  ProfileIcon,
    label: 'Profil',
    match: (p) => p.startsWith('/profile'),
  },
]

export default function BottomNav({ unread = 0 }) {
  const { pathname } = useLocation()
  const { user }     = useAuth()

  return (
    <nav style={{
      position:        'fixed',
      bottom:          0,
      left:            0,
      right:           0,
      height:          64,
      background:      '#fff',
      borderTop:       '1px solid rgba(0,0,0,.08)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-around',
      zIndex:          1000,
      paddingBottom:   'env(safe-area-inset-bottom)',
      boxShadow:       '0 -2px 16px rgba(0,0,0,.06)',
    }}>
      {TABS.map((tab) => {
        const active = tab.match(pathname)
        const Icon   = tab.icon
        return (
          <Link
            key={tab.to}
            to={user || tab.to === '/search' ? tab.to : '/login'}
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            3,
              textDecoration: 'none',
              flex:           1,
              padding:        '6px 0',
              position:       'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon
                size={24}
                color={active ? '#1A9E8A' : '#9CA3AF'}
                filled={active}
              />
              {/* Badge messages non lus */}
              {tab.to === '/messages' && unread > 0 && (
                <span style={{
                  position:   'absolute',
                  top:        -4,
                  right:      -6,
                  background: '#EF4444',
                  color:      '#fff',
                  fontSize:   9,
                  fontWeight: 800,
                  minWidth:   16,
                  height:     16,
                  borderRadius: 8,
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding:    '0 3px',
                  border:     '1.5px solid #fff',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              {/* Avatar profil */}
              {tab.to === '/profile' && user?.avatarUrl && (
                <img
                  src={`${API_URL}${user.avatarUrl}`}
                  alt=""
                  style={{
                    width:        28,
                    height:       28,
                    borderRadius: '50%',
                    objectFit:    'cover',
                    border:       active ? '2px solid #1A9E8A' : '2px solid #E5E7EB',
                    position:     'absolute',
                    top:          -2, left: -2,
                  }}
                />
              )}
            </div>
            <span style={{
              fontSize:   10,
              fontWeight: active ? 700 : 500,
              color:      active ? '#1A9E8A' : '#9CA3AF',
              letterSpacing: '-.01em',
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

// ── Icônes SVG inline ─────────────────────────────────────────

function SearchIcon({ size = 24, color = '#9CA3AF', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7"
        stroke={color} strokeWidth={filled ? 2.5 : 2}
        fill={filled ? color + '22' : 'none'}/>
      <path d="M16.5 16.5L21 21" stroke={color} strokeWidth={filled ? 2.5 : 2} strokeLinecap="round"/>
    </svg>
  )
}

function PlusIcon({ size = 24, color = '#9CA3AF', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9"
        stroke={color} strokeWidth={filled ? 2.5 : 2}
        fill={filled ? color + '22' : 'none'}/>
      <path d="M12 8v8M8 12h8" stroke={color} strokeWidth={filled ? 2.5 : 2} strokeLinecap="round"/>
    </svg>
  )
}

function TicketIcon({ size = 24, color = '#9CA3AF', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 10a2 2 0 0 0 0 4v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3z"
        stroke={color} strokeWidth={filled ? 2.5 : 2}
        fill={filled ? color + '22' : 'none'}/>
      <path d="M9 12h6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray="2 2"/>
    </svg>
  )
}

function ChatIcon({ size = 24, color = '#9CA3AF', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={filled ? 2.5 : 2}
        fill={filled ? color + '22' : 'none'}
        strokeLinejoin="round"/>
    </svg>
  )
}

function ProfileIcon({ size = 24, color = '#9CA3AF', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4"
        stroke={color} strokeWidth={filled ? 2.5 : 2}
        fill={filled ? color + '22' : 'none'}/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={color} strokeWidth={filled ? 2.5 : 2}
        strokeLinecap="round"/>
    </svg>
  )
}
