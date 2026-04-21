import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import { useTripTracking } from '../hooks/useTripTracking'
import { API_URL, authFetch } from '../utils/api'
import TripMap from '../components/TripMap'

// ══════════════════════════════════════════════════════════════
//  MobileTripNavigate — Page de suivi temps réel du trajet
// ══════════════════════════════════════════════════════════════

export default function MobileTripNavigate() {
  const { bookingId } = useParams()
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const { socket, joinConv, leaveConv } = useSocket(user)

  const [booking,    setBooking]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [appChooser, setAppChooser] = useState(false)
  const [midRating,  setMidRating]  = useState(0)
  const [showEndRating, setShowEndRating] = useState(false)
  const [endRating,  setEndRating]  = useState(0)
  const [endComment, setEndComment] = useState('')

  // Charger les détails du booking
  useEffect(() => {
    (async () => {
      try {
        const res  = await authFetch(`${API_URL}/api/trips/booking/${bookingId}`, {})
        const data = await res.json()
        if (data.success) {
          setBooking(data.booking)
          if (joinConv) joinConv(bookingId)
        }
      } catch {}
      finally { setLoading(false) }
    })()
    return () => { if (leaveConv) leaveConv(bookingId) }
  }, [bookingId])

  const isDriver = booking?.driver_id === user?.id

  // Hook de tracking GPS
  const {
    position, otherPosition, progress, status, error,
    showMidTrip, showArrived,
    startTracking, endTrip,
    dismissMidTrip, dismissArrived,
  } = useTripTracking({
    bookingId,
    socket,
    isDriver,
    enabled: !!booking,
  })

  // Afficher le popup de choix au démarrage
  useEffect(() => {
    if (booking && status === 'not_started') {
      setAppChooser(true)
    }
  }, [booking, status])

  // ── Ouvrir une app externe de navigation ────────────────────
  const openNavApp = (app) => {
    if (!booking) return
    const destLat = booking.destination_lat
    const destLon = booking.destination_lon
    const destName = booking.destination_city

    let url = ''
    if (app === 'google') {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}&travelmode=driving`
    } else if (app === 'waze') {
      url = `https://waze.com/ul?ll=${destLat},${destLon}&navigate=yes`
    }

    if (url) window.open(url, '_blank')

    // Démarrer le tracking en arrière-plan dans tous les cas
    setAppChooser(false)
    startTracking()
  }

  const startInApp = () => {
    setAppChooser(false)
    startTracking()
  }

  // Soumettre la note de mi-parcours
  const submitMidRating = async () => {
    await authFetch(`${API_URL}/api/reviews/mid-trip`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ bookingId, rating: midRating }),
    }).catch(() => {})
    dismissMidTrip()
    setMidRating(0)
  }

  // Soumettre la note finale
  const submitEndRating = async () => {
    await authFetch(`${API_URL}/api/reviews`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ bookingId, rating: endRating, comment: endComment }),
    }).catch(() => {})
    await endTrip()
    setShowEndRating(false)
    navigate('/my-trips')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid #E5E7EB', borderTopColor:'#1A9E8A', margin:'0 auto 12px', animation:'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:'#6B7280', fontSize:14 }}>Chargement…</p>
      </div>
    </div>
  )

  if (!booking) return (
    <div style={{ padding:40, textAlign:'center', minHeight:'100vh', background:'#F7F8FA' }}>
      <p style={{ fontSize:15, color:'#6B7280' }}>Trajet introuvable</p>
      <button onClick={() => navigate('/my-trips')}
        style={{ marginTop:20, padding:'12px 24px', background:'#1A9E8A', color:'#fff', border:'none', borderRadius:30, fontSize:14, fontWeight:700, cursor:'pointer' }}>
        Retour
      </button>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'#fff', display:'flex', flexDirection:'column', fontFamily:"-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, padding:'16px', display:'flex', alignItems:'center', gap:12, background:'linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,0))' }}>
        <button onClick={() => navigate('/my-trips')}
          style={{ width:40, height:40, borderRadius:20, background:'rgba(255,255,255,.95)', border:'none', fontSize:20, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.15)' }}>
          ‹
        </button>
        <div style={{ flex:1, background:'rgba(255,255,255,.95)', borderRadius:14, padding:'8px 14px', boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#111' }}>
            {booking.origin_city} → {booking.destination_city}
          </div>
          <div style={{ fontSize:11, color:'#6B7280' }}>
            {status === 'in_progress' ? 'Trajet en cours' : status === 'arrived' ? 'Arrivé !' : status === 'completed' ? 'Terminé' : 'Prêt à partir'}
          </div>
        </div>
      </div>

      {/* Map plein écran */}
      <div style={{ flex:1 }}>
        <TripMap
          origin={booking.origin_lat ? { lat:booking.origin_lat, lon:booking.origin_lon, name:booking.origin_city } : null}
          destination={booking.destination_lat ? { lat:booking.destination_lat, lon:booking.destination_lon, name:booking.destination_city } : null}
          myPosition={position}
          otherPosition={otherPosition}
          progress={progress}
          height="100%"
        />
      </div>

      {/* Panel bas */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:10, background:'#fff', borderRadius:'24px 24px 0 0', padding:'20px', boxShadow:'0 -4px 20px rgba(0,0,0,.1)', paddingBottom:'calc(20px + env(safe-area-inset-bottom))' }}>

        {error && (
          <div style={{ background:'#FEF2F2', borderRadius:10, padding:'10px 14px', color:'#DC2626', fontSize:13, marginBottom:12 }}>
            ⚠️ {error}
          </div>
        )}

        {status === 'in_progress' && position && (
          <div style={{ display:'flex', gap:10, marginBottom:14 }}>
            <Stat label="Vitesse" value={`${Math.round((position.speed || 0) * 3.6)} km/h`}/>
            <Stat label="Progression" value={`${progress}%`}/>
          </div>
        )}

        {status === 'in_progress' ? (
          <button onClick={() => setShowEndRating(true)}
            style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background:'#EF4444', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
            Terminer le trajet
          </button>
        ) : status === 'arrived' ? (
          <button onClick={() => setShowEndRating(true)}
            style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
            🎉 Terminer et évaluer
          </button>
        ) : status !== 'completed' && (
          <button onClick={() => setAppChooser(true)}
            style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer' }}>
            🚗 Démarrer le trajet
          </button>
        )}
      </div>

      {/* Popup choix d'app */}
      {appChooser && (
        <Popup onClose={() => setAppChooser(false)} title="Comment naviguer ?" subtitle="Choisissez votre application">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <AppChoice icon="🗺️" name="Clando" desc="Carte intégrée dans l'app" onClick={startInApp}/>
            <AppChoice icon="🌎" name="Google Maps" desc="Navigation pas-à-pas" onClick={() => openNavApp('google')}/>
            <AppChoice icon="🚦" name="Waze" desc="Alertes trafic et radars" onClick={() => openNavApp('waze')}/>
          </div>
          <p style={{ fontSize:11, color:'#9CA3AF', textAlign:'center', margin:'16px 0 0' }}>
            Le trajet sera suivi en arrière-plan quel que soit votre choix
          </p>
        </Popup>
      )}

      {/* Popup mi-parcours */}
      {showMidTrip && (
        <Popup onClose={() => dismissMidTrip()} title="Comment ça se passe ?" subtitle="Vous êtes à mi-parcours">
          <p style={{ fontSize:13, color:'#6B7280', textAlign:'center', margin:'0 0 18px' }}>
            Un avis rapide sur le trajet jusqu'ici ?
          </p>
          <Stars value={midRating} onChange={setMidRating}/>
          <button onClick={submitMidRating} disabled={!midRating}
            style={{ width:'100%', marginTop:20, padding:'14px', border:'none', borderRadius:14, background: midRating ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#E5E7EB', color:'#fff', fontSize:14, fontWeight:800, cursor: midRating ? 'pointer' : 'not-allowed' }}>
            Envoyer
          </button>
          <button onClick={dismissMidTrip}
            style={{ width:'100%', marginTop:8, padding:'10px', border:'none', background:'transparent', color:'#9CA3AF', fontSize:13, cursor:'pointer' }}>
            Plus tard
          </button>
        </Popup>
      )}

      {/* Popup arrivée */}
      {showArrived && !showEndRating && (
        <Popup onClose={() => dismissArrived()} title="🎉 Vous êtes arrivé !" subtitle={booking.destination_city}>
          <button onClick={() => { dismissArrived(); setShowEndRating(true) }}
            style={{ width:'100%', padding:'14px', border:'none', borderRadius:14, background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer' }}>
            Évaluer le trajet
          </button>
        </Popup>
      )}

      {/* Popup évaluation finale */}
      {showEndRating && (
        <Popup onClose={() => setShowEndRating(false)} title="Évaluer le trajet" subtitle={`${isDriver ? 'Votre passager' : 'Votre conducteur'}`}>
          <Stars value={endRating} onChange={setEndRating} size="lg"/>
          <textarea value={endComment} onChange={e=>setEndComment(e.target.value)}
            placeholder="Un commentaire (optionnel)…" rows={3}
            style={{ width:'100%', marginTop:16, padding:'12px', border:'1.5px solid #E5E7EB', borderRadius:12, fontSize:14, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box' }}/>
          <button onClick={submitEndRating} disabled={!endRating}
            style={{ width:'100%', marginTop:16, padding:'14px', border:'none', borderRadius:14, background: endRating ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#E5E7EB', color:'#fff', fontSize:14, fontWeight:800, cursor: endRating ? 'pointer' : 'not-allowed' }}>
            Terminer le trajet
          </button>
        </Popup>
      )}
    </div>
  )
}

// ── Composants internes ───────────────────────────────────────
function Stat({ label, value }) {
  return (
    <div style={{ flex:1, background:'#F7F8FA', borderRadius:12, padding:'10px 12px' }}>
      <div style={{ fontSize:11, color:'#6B7280', fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:900, color:'#111', marginTop:2 }}>{value}</div>
    </div>
  )
}

function Popup({ title, subtitle, children, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:22, padding:'28px 22px', maxWidth:360, width:'100%', boxShadow:'0 16px 40px rgba(0,0,0,.3)' }}>
        <h2 style={{ fontSize:20, fontWeight:900, color:'#111', margin:'0 0 4px', textAlign:'center' }}>{title}</h2>
        {subtitle && <p style={{ fontSize:13, color:'#6B7280', textAlign:'center', margin:'0 0 20px' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}

function AppChoice({ icon, name, desc, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', border:'1.5px solid #E5E7EB', borderRadius:14, background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left', width:'100%' }}>
      <span style={{ fontSize:26 }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'#111' }}>{name}</div>
        <div style={{ fontSize:12, color:'#6B7280', marginTop:2 }}>{desc}</div>
      </div>
      <span style={{ fontSize:20, color:'#D1D5DB' }}>›</span>
    </button>
  )
}

function Stars({ value, onChange, size = 'md' }) {
  const s = size === 'lg' ? 40 : 32
  return (
    <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          style={{ width:s, height:s, border:'none', background:'none', cursor:'pointer', fontSize:s, padding:0, color: n <= value ? '#F59E0B' : '#E5E7EB' }}>
          ★
        </button>
      ))}
    </div>
  )
}
