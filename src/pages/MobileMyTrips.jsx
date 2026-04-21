import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'

// ══════════════════════════════════════════════════════════════
//  MobileMyTrips — Mes trajets (style BlaBlaCar)
//  Onglets : À venir / Passés / Publiés
// ══════════════════════════════════════════════════════════════

export default function MobileMyTrips() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab,     setTab]     = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [myTrips, setMyTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const load = async () => {
      setLoading(true)
      try {
        const [r1, r2] = await Promise.all([
          authFetch(`${API_URL}/api/trips/my-bookings`, {}),
          authFetch(`${API_URL}/api/trips/my-published`, {}),
        ])
        const d1 = await r1.json()
        const d2 = await r2.json()
        if (d1.success) setBookings(d1.bookings || [])
        if (d2.success) setMyTrips(d2.trips || [])
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [user])

  if (!user) return (
    <div style={{ padding:'80px 24px', textAlign:'center', background:'#F7F8FA', minHeight:'100vh' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🎫</div>
      <h2 style={{ fontSize:20, fontWeight:900, color:'#111827', marginBottom:8 }}>Vos trajets</h2>
      <p style={{ fontSize:14, color:'#6B7280', marginBottom:32 }}>Connectez-vous pour voir vos trajets</p>
      <button onClick={() => navigate('/login')}
        style={{ padding:'14px 40px', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none', borderRadius:30, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
        Se connecter
      </button>
    </div>
  )

  const now = Date.now()

  // Mes réservations (passager)
  const upcomingBookings = bookings.filter(b => new Date(b.departure_time).getTime() > now)
  const pastBookings     = bookings.filter(b => new Date(b.departure_time).getTime() <= now)

  // Trajets publiés (conducteur)
  const upcomingPublished = myTrips.filter(t => new Date(t.departure_time).getTime() > now)

  return (
    <div style={{ background:'#F7F8FA', minHeight:'100vh', paddingBottom:80, fontFamily:"-apple-system,'SF Pro Display',sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#fff', paddingTop:48, paddingBottom:0, borderBottom:'1px solid #F3F4F6' }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:'#111827', margin:'0 20px 16px', letterSpacing:'-.03em' }}>
          Vos trajets
        </h1>

        {/* Onglets */}
        <div style={{ display:'flex', borderBottom:'1px solid #F3F4F6' }}>
          {[
            { v:'upcoming',  label:'À venir',   count: upcomingBookings.length + upcomingPublished.length },
            { v:'past',      label:'Passés',    count: pastBookings.length },
            { v:'published', label:'Publiés',   count: myTrips.length },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              style={{
                flex:1, padding:'14px 4px', border:'none', background:'none',
                borderBottom: tab === t.v ? '3px solid #111827' : '3px solid transparent',
                cursor:'pointer', fontFamily:'inherit',
              }}>
              <div style={{ fontSize:14, fontWeight: tab === t.v ? 800 : 500, color: tab === t.v ? '#111827' : '#9CA3AF' }}>
                {t.label}
              </div>
              {t.count > 0 && (
                <div style={{ fontSize:12, fontWeight:700, color: tab === t.v ? '#111827' : '#C4C9D4', marginTop:2 }}>
                  {t.count}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #E5E7EB', borderTopColor:'#1A9E8A', margin:'0 auto 12px', animation:'spin .8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:'#6B7280', fontSize:14 }}>Chargement…</p>
        </div>
      )}

      {/* Contenu selon onglet */}
      {!loading && (
        <div style={{ padding:'16px' }}>

          {tab === 'upcoming' && (
            <>
              {upcomingBookings.length + upcomingPublished.length === 0 ? (
                <EmptyState
                  icon="📭"
                  title="Aucun trajet à venir"
                  text="Vos prochaines réservations apparaîtront ici"
                  action={() => navigate('/search')}
                  actionLabel="Rechercher un trajet"
                />
              ) : (
                <>
                  {upcomingPublished.map(trip => (
                    <TripCard key={'pub-'+trip.id} trip={trip} role="driver" onClick={() => navigate(`/messages?trip=${trip.id}`)}/>
                  ))}
                  {upcomingBookings.map(booking => (
                    <TripCard key={'book-'+booking.id} trip={booking} role="passenger" onClick={() => navigate(`/messages?booking=${booking.id}`)}/>
                  ))}
                </>
              )}
            </>
          )}

          {tab === 'past' && (
            <>
              {pastBookings.length === 0 ? (
                <EmptyState
                  icon="📜"
                  title="Aucun trajet passé"
                  text="Votre historique apparaîtra ici"
                />
              ) : (
                pastBookings.map(booking => (
                  <TripCard key={booking.id} trip={booking} role="passenger" past onClick={() => navigate(`/messages?booking=${booking.id}`)}/>
                ))
              )}
            </>
          )}

          {tab === 'published' && (
            <>
              {myTrips.length === 0 ? (
                <EmptyState
                  icon="🚗"
                  title="Aucun trajet publié"
                  text="Publiez votre premier trajet et partagez les frais"
                  action={() => navigate('/publish')}
                  actionLabel="Publier un trajet"
                />
              ) : (
                myTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} role="driver" onClick={() => navigate(`/messages?trip=${trip.id}`)}/>
                ))
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}

// ── Carte trajet ────────────────────────────────────────────────
function TripCard({ trip, role, past, onClick }) {
  const statusColor = {
    pending:   { bg:'#FEF3C7', fg:'#92400E', label:'En attente' },
    confirmed: { bg:'#D1FAE5', fg:'#065F46', label:'Confirmé'   },
    cancelled: { bg:'#FEE2E2', fg:'#991B1B', label:'Annulé'     },
    completed: { bg:'#E5E7EB', fg:'#374151', label:'Terminé'    },
  }[trip.status] || { bg:'#F3F4F6', fg:'#6B7280', label: trip.status }

  const depTime = new Date(trip.departure_time)
  const fmtT = (d) => `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
  const fmtD = (d) => d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })

  return (
    <div onClick={onClick}
      style={{
        background:'#fff', borderRadius:18, padding:'18px',
        marginBottom:10, border:'1px solid #E5E7EB',
        boxShadow:'0 1px 4px rgba(0,0,0,.04)',
        cursor:'pointer', opacity: past ? .7 : 1,
      }}>

      {/* Header : rôle + statut */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:800, color: role === 'driver' ? '#1A9E8A' : '#7C3AED', textTransform:'uppercase', letterSpacing:'.08em' }}>
          {role === 'driver' ? '🚗 Conducteur' : '🧳 Passager'}
        </span>
        {trip.status && (
          <span style={{ background: statusColor.bg, color: statusColor.fg, padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:700 }}>
            {statusColor.label}
          </span>
        )}
      </div>

      {/* Trajet */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>

        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', minWidth:56 }}>
          <span style={{ fontSize:16, fontWeight:800, color:'#111' }}>{fmtT(depTime)}</span>
          <span style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{fmtD(depTime)}</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:4, flexShrink:0 }}>
          <div style={{ width:10,height:10,borderRadius:'50%',border:'2px solid #374151',background:'#fff' }}/>
          <div style={{ width:2,height:24,background:'#D1D5DB',margin:'3px 0' }}/>
          <div style={{ width:10,height:10,borderRadius:'50%',border:'2px solid #374151',background:'#fff' }}/>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15,fontWeight:700,color:'#111827',marginBottom:16 }}>
            {trip.origin_city}
          </div>
          <div style={{ fontSize:15,fontWeight:700,color:'#111827' }}>
            {trip.destination_city}
          </div>
        </div>

        <div style={{ flexShrink:0, textAlign:'right' }}>
          <div style={{ fontSize:16,fontWeight:900,color:'#1A9E8A' }}>
            {Number(trip.price_per_seat).toLocaleString('fr-FR')}
          </div>
          <div style={{ fontSize:10,color:'#9CA3AF',fontWeight:600 }}>FCFA</div>
        </div>
      </div>

      {/* Footer : autre personne */}
      {(trip.driver_name || trip.passenger_name) && (
        <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32,height:32,borderRadius:'50%',background:'#E5E7EB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#6B7280' }}>
            {(role === 'driver' ? trip.passenger_name : trip.driver_name)?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>
            {role === 'driver' ? trip.passenger_name : trip.driver_name}
          </div>
          <div style={{ marginLeft:'auto', fontSize:13, color:'#9CA3AF' }}>›</div>
        </div>
      )}
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────
function EmptyState({ icon, title, text, action, actionLabel }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:52, marginBottom:16 }}>{icon}</div>
      <p style={{ fontSize:17, fontWeight:800, color:'#111827', margin:'0 0 6px' }}>{title}</p>
      <p style={{ fontSize:14, color:'#9CA3AF', margin:'0 0 24px' }}>{text}</p>
      {action && (
        <button onClick={action}
          style={{ padding:'13px 28px', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none', borderRadius:30, fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
