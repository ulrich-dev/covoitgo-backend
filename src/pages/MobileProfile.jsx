import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'

// ══════════════════════════════════════════════════════════════
//  MobileProfile — Profil (style BlaBlaCar)
//  Vérifications · Préférences · Stats · Paramètres · Déconnexion
// ══════════════════════════════════════════════════════════════

export default function MobileProfile() {
  const { user, logout, fetchMe } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [view,  setView]  = useState('main') // main | edit | settings

  useEffect(() => {
    if (!user) return
    // Charger stats
    authFetch(`${API_URL}/api/trips/my-stats`, {})
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(() => {})
  }, [user])

  if (!user) return (
    <div style={{ padding:'80px 24px', textAlign:'center', background:'#F7F8FA', minHeight:'100vh', fontFamily:"-apple-system,sans-serif" }}>
      <div style={{ fontSize:56, marginBottom:16 }}>👤</div>
      <h2 style={{ fontSize:22, fontWeight:900, color:'#111827', marginBottom:8 }}>Bienvenue sur Clando</h2>
      <p style={{ fontSize:14, color:'#6B7280', marginBottom:32, maxWidth:280, margin:'0 auto 32px' }}>
        Connectez-vous pour accéder à votre profil et gérer vos trajets
      </p>
      <button onClick={() => navigate('/login')}
        style={{ padding:'14px 40px', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none', borderRadius:30, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', marginBottom:10, display:'block', margin:'0 auto 10px' }}>
        Se connecter
      </button>
      <button onClick={() => navigate('/register')}
        style={{ padding:'12px 32px', background:'#fff', color:'#1A9E8A', border:'2px solid #1A9E8A', borderRadius:30, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'block', margin:'10px auto 0' }}>
        Créer un compte
      </button>
    </div>
  )

  const firstLetter = user.firstName?.[0]?.toUpperCase() || '?'
  const avatarBg = user.avatarColor || '#1A9E8A'

  return (
    <div style={{ background:'#F7F8FA', minHeight:'100vh', paddingBottom:80, fontFamily:"-apple-system,'SF Pro Display',sans-serif" }}>

      {/* ── Bloc profil ──────────────────────────────────────── */}
      <div style={{ background:'#fff', paddingTop:48, paddingBottom:24, textAlign:'center', borderBottom:'1px solid #F3F4F6' }}>

        {/* Avatar */}
        <div style={{ position:'relative', display:'inline-block', marginBottom:16 }}>
          {user.avatarUrl ? (
            <img src={`${API_URL}${user.avatarUrl}`} alt=""
              style={{ width:96, height:96, borderRadius:'50%', objectFit:'cover', border:'4px solid #fff', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}/>
          ) : (
            <div style={{ width:96, height:96, borderRadius:'50%', background:avatarBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, fontWeight:900, color:'#fff', margin:'0 auto' }}>
              {firstLetter}
            </div>
          )}
          <button onClick={() => navigate('/profile/edit')}
            style={{ position:'absolute', bottom:0, right:0, width:32, height:32, borderRadius:'50%', background:'#111', color:'#fff', border:'3px solid #fff', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✎
          </button>
        </div>

        {/* Nom */}
        <h1 style={{ fontSize:22, fontWeight:900, color:'#111', margin:'0 0 4px', letterSpacing:'-.02em' }}>
          {user.firstName} {user.lastName}
        </h1>
        <p style={{ fontSize:13, color:'#6B7280', margin:'0 0 16px' }}>
          Membre depuis {user.memberSince ? new Date(user.memberSince).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}) : 'récemment'}
        </p>

        {/* Note */}
        {user.rating > 0 && (
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#FFFBEB', padding:'6px 14px', borderRadius:20, border:'1px solid #FCD34D' }}>
            <span style={{ fontSize:14 }}>⭐</span>
            <span style={{ fontSize:14, fontWeight:800, color:'#92400E' }}>
              {parseFloat(user.rating).toFixed(1)}
            </span>
            <span style={{ fontSize:12, color:'#92400E' }}>
              ({user.reviewCount || 0} avis)
            </span>
          </div>
        )}

        {/* Édition rapide */}
        <button onClick={() => navigate('/profile/edit')}
          style={{ display:'block', margin:'16px auto 0', padding:'10px 28px', background:'#F3F4F6', color:'#111', border:'none', borderRadius:30, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          Modifier le profil
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      {stats && (
        <div style={{ background:'#fff', margin:'12px 0', padding:'20px', display:'flex' }}>
          <StatBlock value={stats.tripsCompleted || 0} label="Trajets" />
          <StatBlock value={stats.passengersHelped || 0} label="Passagers" />
          <StatBlock value={stats.kmTraveled || 0} label="km parcourus" />
        </div>
      )}

      {/* ── Vérifications ───────────────────────────────────── */}
      <div style={{ background:'#fff', marginBottom:12 }}>
        <h3 style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', margin:0, padding:'16px 20px 8px', textTransform:'uppercase', letterSpacing:'.08em' }}>
          Vérifications
        </h3>
        <Row
          icon={user.emailVerified ? '✅' : '⚠️'}
          label="Email"
          value={user.email}
          badge={user.emailVerified ? 'Vérifié' : 'Non vérifié'}
          badgeColor={user.emailVerified ? '#10B981' : '#F59E0B'}
        />
        <Row
          icon={user.phone ? '✅' : '📱'}
          label="Téléphone"
          value={user.phone || 'Non renseigné'}
          badge={user.phone ? 'Vérifié' : 'Ajouter'}
          badgeColor={user.phone ? '#10B981' : '#1A9E8A'}
          onClick={!user.phone ? () => navigate('/profile/edit') : undefined}
        />
        <Row
          icon="🆔"
          label="Pièce d'identité"
          value="Non vérifiée"
          badge="Vérifier"
          badgeColor="#1A9E8A"
          onClick={() => navigate('/profile/verify-id')}
          last
        />
      </div>

      {/* ── À propos de moi ────────────────────────────────── */}
      <div style={{ background:'#fff', marginBottom:12 }}>
        <h3 style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', margin:0, padding:'16px 20px 8px', textTransform:'uppercase', letterSpacing:'.08em' }}>
          À propos
        </h3>
        <div style={{ padding:'0 20px 18px', fontSize:14, color: user.bio ? '#374151' : '#9CA3AF', lineHeight:1.6 }}>
          {user.bio || 'Ajoutez une description pour vous présenter aux autres utilisateurs.'}
        </div>
      </div>

      {/* ── Mes trajets ───────────────────────────────────── */}
      <div style={{ background:'#fff', marginBottom:12 }}>
        <h3 style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', margin:0, padding:'16px 20px 8px', textTransform:'uppercase', letterSpacing:'.08em' }}>
          Mes trajets
        </h3>
        <Row icon="🎫" label="Mes réservations" onClick={() => navigate('/my-trips')}/>
        <Row icon="🚗" label="Trajets publiés"   onClick={() => navigate('/my-trips?tab=published')}/>
        <Row icon="🔔" label="Alertes trajets"    onClick={() => navigate('/alerts')} last/>
      </div>

      {/* ── Paramètres ────────────────────────────────────── */}
      <div style={{ background:'#fff', marginBottom:12 }}>
        <h3 style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', margin:0, padding:'16px 20px 8px', textTransform:'uppercase', letterSpacing:'.08em' }}>
          Paramètres
        </h3>
        <Row icon="🌐" label="Langue" value={user.language === 'fr' ? 'Français' : 'English'} onClick={() => navigate('/profile/language')}/>
        <Row icon="🔒" label="Sécurité & mot de passe" onClick={() => navigate('/profile/security')}/>
        <Row icon="💳" label="Moyens de paiement" onClick={() => navigate('/profile/payment')}/>
        <Row icon="🔕" label="Notifications" onClick={() => navigate('/profile/notifications')} last/>
      </div>

      {/* ── Aide & légal ──────────────────────────────────── */}
      <div style={{ background:'#fff', marginBottom:12 }}>
        <h3 style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', margin:0, padding:'16px 20px 8px', textTransform:'uppercase', letterSpacing:'.08em' }}>
          Aide & à propos
        </h3>
        <Row icon="❓" label="Centre d'aide" onClick={() => navigate('/contact')}/>
        <Row icon="📧" label="Nous contacter" onClick={() => navigate('/contact')}/>
        <Row icon="📜" label="Conditions d'utilisation" onClick={() => navigate('/terms')}/>
        <Row icon="🔐" label="Confidentialité" onClick={() => navigate('/privacy')} last/>
      </div>

      {/* ── Déconnexion ───────────────────────────────────── */}
      <div style={{ padding:'20px' }}>
        <button onClick={async () => { await logout(); navigate('/') }}
          style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background:'#FEF2F2', color:'#DC2626', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          🚪 Se déconnecter
        </button>
        <p style={{ fontSize:11, color:'#9CA3AF', textAlign:'center', margin:'16px 0 0' }}>
          Clando v1.0 · Made in Cameroon 🇨🇲
        </p>
      </div>
    </div>
  )
}

// ── Ligne de paramètre ────────────────────────────────────────
function Row({ icon, label, value, badge, badgeColor, onClick, last }) {
  return (
    <div
      onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:14,
        padding:'14px 20px',
        borderBottom: last ? 'none' : '1px solid #F3F4F6',
        cursor: onClick ? 'pointer' : 'default',
      }}>
      <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#111' }}>{label}</div>
        {value && (
          <div style={{ fontSize:12, color:'#6B7280', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {value}
          </div>
        )}
      </div>
      {badge && (
        <span style={{ fontSize:11, fontWeight:700, color: badgeColor, background: badgeColor + '15', padding:'4px 10px', borderRadius:12 }}>
          {badge}
        </span>
      )}
      {onClick && !badge && (
        <span style={{ fontSize:18, color:'#D1D5DB', flexShrink:0 }}>›</span>
      )}
    </div>
  )
}

// ── Bloc de statistique ────────────────────────────────────────
function StatBlock({ value, label }) {
  return (
    <div style={{ flex:1, textAlign:'center', borderRight:'1px solid #F3F4F6' }}>
      <div style={{ fontSize:22, fontWeight:900, color:'#111', letterSpacing:'-.02em' }}>{value}</div>
      <div style={{ fontSize:11, color:'#6B7280', marginTop:2, fontWeight:600 }}>{label}</div>
    </div>
  )
}
