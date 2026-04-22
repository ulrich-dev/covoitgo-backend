import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMobile'
import { API_URL, authFetch } from '../utils/api'
import { POPULAR_ROUTES, MAJOR_CITIES } from '../data/cameroun'

const fmtTime = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (isNaN(d)) return '--:--'
  return `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
}
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})
}
const fmtFull = (iso) => {
  if (!iso) return "Aujourd'hui"
  const d = new Date(iso)
  if (isNaN(d)) return "Aujourd'hui"
  return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
}
const fmtFCFA = (n) => n ? `${Number(n).toLocaleString('fr-FR')} FCFA` : ''

// ── Normaliseur backend → frontend ───────────────────────────
// Le backend peut renvoyer soit camelCase (API v2) soit snake_case (ancien)
// Ce helper uniformise le tout
const normalizeTrip = (t) => ({
  id:                t.id,
  origin_city:       t.from              || t.origin_city        || '',
  destination_city:  t.to                || t.destination_city   || '',
  origin_address:    t.fromAddress       || t.origin_address     || '',
  destination_address: t.toAddress       || t.destination_address || '',
  departure_time:    t.departureAt       || t.departure_time     || null,
  arrival_time:      t.estimatedArrival  || t.arrival_time       || null,
  price_per_seat:    Number(t.price ?? t.price_per_seat ?? 0),
  available_seats:   parseInt(t.remaining ?? t.availableSeats ?? t.available_seats ?? 0),
  total_seats:       parseInt(t.totalSeats ?? t.total_seats ?? 0),
  preferences:       t.prefs             || t.preferences        || [],
  duration:          t.duration          || '',
  // Conducteur
  driver_id:         t.driverId          || t.driver_id          || null,
  driver_name:       t.driverName        || `${t.driverFirstName||''} ${t.driverLastName||''}`.trim() || 'Conducteur',
  driver_avatar:     t.driverAvatar      || (t.driverFirstName?.[0] || '?').toUpperCase(),
  driver_avatar_url: t.driverAvatarUrl   || t.driver_avatar_url  || null,
  driver_avatar_color: t.driverColor     || t.driver_avatar_color || '#1A9E8A',
  driver_rating:     Number(t.driverRating ?? t.driver_rating ?? 0),
  driver_reviews:    Number(t.driverReviews ?? t.driver_reviews ?? 0),
  driver_verified:   t.driverVerified    || t.driver_verified    || false,
})

const PREF_FILTERS = [
  { id:'Climatisé',    icon:'❄️' },
  { id:'Musique ok',   icon:'🎵' },
  { id:'Animaux ok',   icon:'🐾' },
  { id:'Silencieux',   icon:'🤫' },
  { id:'Non-fumeur',   icon:'🚭' },
  { id:'Chargeur USB', icon:'🔌' },
]

export default function SearchTrips() {
  const [urlParams] = useSearchParams()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const isMobile    = useMobile()

  const [from, setFrom] = useState(urlParams.get('from') || '')
  const [to,   setTo]   = useState(urlParams.get('to')   || '')
  const [date, setDate] = useState(urlParams.get('date') || '')
  const [pax,  setPax]  = useState(urlParams.get('passengers') || '1')

  const [trips,       setTrips]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const [maxPrice,    setMaxPrice]    = useState(20000)
  const [sortBy,      setSortBy]      = useState('departure')
  const [timeSlot,    setTimeSlot]    = useState('all')
  const [activePrefs, setActivePrefs] = useState([])
  const [panel,       setPanel]       = useState(null)

  const [selected,    setSelected]    = useState(null)
  const [booking,     setBooking]     = useState({})
  const [bookMsg,     setBookMsg]     = useState('')

  const doSearch = useCallback(async (f, t, d, p) => {
    setLoading(true); setError(''); setHasSearched(true); setSelected(null)
    try {
      const q = new URLSearchParams()
      if (f) q.set('from', f)
      if (t) q.set('to',   t)
      if (d) q.set('date', d)
      if (p) q.set('passengers', p)
      const res  = await authFetch(`${API_URL}/api/trips/search?${q}`, {})
      const data = await res.json()
      // Peut être `data.trips`, `data.results` ou un array direct
      const raw = data.trips || data.results || (Array.isArray(data) ? data : [])
      setTrips(raw.map(normalizeTrip))
      if (!data.success && !Array.isArray(data)) {
        setError(data.message || '')
      }
    } catch (err) {
      console.error('search error:', err)
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (from && to) doSearch(from, to, date, pax) }, [])

  const filtered = trips.filter(t => {
    if (t.price_per_seat > maxPrice) return false
    if (activePrefs.length > 0 && !activePrefs.every(p => t.preferences?.includes(p))) return false
    if (timeSlot !== 'all' && t.departure_time) {
      const h = new Date(t.departure_time).getHours()
      if (timeSlot === 'morning'   && !(h >= 5  && h < 12)) return false
      if (timeSlot === 'afternoon' && !(h >= 12 && h < 18)) return false
      if (timeSlot === 'evening'   && h < 18) return false
    }
    return true
  }).sort((a,b) => {
    if (sortBy === 'price')  return a.price_per_seat - b.price_per_seat
    if (sortBy === 'rating') return (b.driver_rating||0) - (a.driver_rating||0)
    return new Date(a.departure_time) - new Date(b.departure_time)
  })

  const handleBook = async (tripId) => {
    if (!user) { navigate('/login'); return }
    try {
      const res  = await authFetch(`${API_URL}/api/trips/${tripId}/book`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ seats: parseInt(pax) }),
      })
      const data = await res.json()
      setBookMsg(data.message || (data.success ? 'Demande envoyée !' : 'Erreur'))
      if (data.success) setBooking(b => ({ ...b, [tripId]: true }))
      setTimeout(() => setBookMsg(''), 3000)
    } catch { setBookMsg('Erreur.'); setTimeout(() => setBookMsg(''), 2000) }
  }

  const nbFilters = (maxPrice < 20000 ? 1 : 0) + (timeSlot !== 'all' ? 1 : 0) + activePrefs.length

  // ── Retour vers accueil simplifié ─────────────────────────
  const goHome = () => navigate('/')

  if (isMobile) return (
    <div style={{ background:'#ECEEF3', minHeight:'100vh', fontFamily:"-apple-system,'SF Pro Display',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} ::-webkit-scrollbar{display:none}`}</style>

      {bookMsg && (
        <div style={{ position:'fixed',top:16,left:16,right:16,zIndex:9999,background:'#1A9E8A',color:'#fff',borderRadius:14,padding:'14px 18px',fontWeight:700,fontSize:14,textAlign:'center',boxShadow:'0 8px 24px rgba(0,0,0,.2)' }}>
          {bookMsg}
        </div>
      )}

      {/* Header avec retour accueil */}
      <div style={{ background:'#fff', paddingTop:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px 10px' }}>
          <button onClick={goHome}
            style={{ background:'none',border:'none',fontSize:26,cursor:'pointer',color:'#111',padding:'0 4px 0 0',lineHeight:1,fontWeight:300 }}>
            ‹
          </button>
          <button onClick={() => setPanel('search')}
            style={{ flex:1,background:'#F2F3F7',border:'none',borderRadius:16,padding:'10px 14px',textAlign:'left',cursor:'pointer',fontFamily:'inherit' }}>
            <div style={{ fontSize:14,fontWeight:700,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
              {from && to ? `${from} → ${to}` : 'Où allez-vous ?'}
            </div>
            <div style={{ fontSize:12,color:'#6B7280',marginTop:2 }}>
              {fmtFull(date)} · {pax} adulte{parseInt(pax)>1?'s':''}
            </div>
          </button>
        </div>

        <div style={{ display:'flex' }}>
          {[
            { label:'Tout',        count: hasSearched ? filtered.length : null },
            { label:'Covoiturage', count: hasSearched ? filtered.length : null },
            { label:'Bus',         count: null },
            { label:'Train',       count: null },
          ].map((tab, i) => (
            <div key={tab.label} style={{
              flex:1, textAlign:'center', padding:'10px 0 14px',
              borderBottom: i===0 ? '3px solid #111827' : '3px solid transparent',
            }}>
              <div style={{ fontSize:14,fontWeight:i===0?800:500,color:i===0?'#111827':'#9CA3AF' }}>
                {tab.label}
              </div>
              <div style={{ fontSize:12,fontWeight:700,color:i===0?'#111827':'#C4C9D4',marginTop:1 }}>
                {tab.count !== null ? tab.count : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex',gap:8,padding:'12px 16px',overflowX:'auto' }}>
        {[
          { action:()=>setPanel('filters'), label:`⚙️ Filtres${nbFilters>0?' ('+nbFilters+')':''}`, active: nbFilters>0 },
          { action:()=>setSortBy('departure'), label:'⏰ Heure',  active: sortBy==='departure' },
          { action:()=>setSortBy('price'),    label:'💰 Prix',   active: sortBy==='price' },
          { action:()=>setSortBy('rating'),   label:'⭐ Note',   active: sortBy==='rating' },
        ].map((b,i) => (
          <button key={i} onClick={b.action} style={{
            flexShrink:0,padding:'8px 14px',borderRadius:20,border:'none',
            background: b.active ? '#111827' : '#fff',
            color: b.active ? '#fff' : '#374151',
            fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
            boxShadow:'0 1px 4px rgba(0,0,0,.08)',
          }}>{b.label}</button>
        ))}
      </div>

      <div style={{ padding:'0 16px 100px' }}>
        {loading && (
          <div style={{ textAlign:'center',padding:'56px 0' }}>
            <div style={{ width:32,height:32,borderRadius:'50%',border:'3px solid #E5E7EB',borderTopColor:'#1A9E8A',margin:'0 auto 12px',animation:'spin .8s linear infinite' }}/>
            <p style={{ color:'#6B7280',fontSize:14 }}>Recherche en cours…</p>
          </div>
        )}

        {error && <div style={{ background:'#FEF2F2',borderRadius:14,padding:'14px',color:'#DC2626',fontSize:14,margin:'8px 0' }}>⚠️ {error}</div>}

        {!loading && !hasSearched && (
          <div style={{ textAlign:'center',padding:'72px 0' }}>
            <div style={{ fontSize:52,marginBottom:16 }}>🚗</div>
            <p style={{ fontSize:16,fontWeight:700,color:'#374151' }}>Trouvez votre trajet</p>
          </div>
        )}

        {!loading && hasSearched && filtered.length === 0 && (
          <div style={{ textAlign:'center',padding:'60px 0' }}>
            <div style={{ fontSize:48,marginBottom:16 }}>😔</div>
            <p style={{ fontSize:17,fontWeight:800,color:'#111827',margin:'0 0 8px' }}>Aucun trajet disponible</p>
            <p style={{ fontSize:14,color:'#9CA3AF' }}>Essayez une autre date</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <h2 style={{ fontSize:20,fontWeight:900,color:'#111827',margin:'16px 0 10px',letterSpacing:'-.02em' }}>
            {fmtFull(date)}
          </h2>
        )}

        {!loading && filtered.map(trip => (
          <BlaCard key={trip.id} trip={trip} selected={selected===trip.id} booked={!!booking[trip.id]}
            onSelect={()=>setSelected(selected===trip.id?null:trip.id)}
            onBook={()=>handleBook(trip.id)} user={user} navigate={navigate}/>
        ))}
      </div>

      {panel === 'search' && (
        <SearchSheet from={from} setFrom={setFrom} to={to} setTo={setTo}
          date={date} setDate={setDate} pax={pax} setPax={setPax}
          onSearch={()=>{ setPanel(null); doSearch(from,to,date,pax) }}
          onClose={()=>setPanel(null)}/>
      )}
      {panel === 'filters' && (
        <FiltersSheet maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          timeSlot={timeSlot} setTimeSlot={setTimeSlot}
          activePrefs={activePrefs} setActivePrefs={setActivePrefs}
          onClose={()=>setPanel(null)}/>
      )}
    </div>
  )

  // DESKTOP
  return (
    <div style={{ background:'#F7F5F2',minHeight:'calc(100vh - 72px)',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      {bookMsg && <div style={{ position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',background:'#1A9E8A',color:'#fff',padding:'12px 24px',borderRadius:12,fontWeight:700,zIndex:9999 }}>{bookMsg}</div>}
      <div style={{ background:'#fff',padding:'20px',borderBottom:'1px solid #E5E7EB',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center' }}>
        <button onClick={goHome} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#374151',padding:'0 4px' }}>‹</button>
        <select value={from} onChange={e=>setFrom(e.target.value)} style={{ flex:1,minWidth:140,padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14 }}>
          <option value="">Départ</option>{MAJOR_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={to} onChange={e=>setTo(e.target.value)} style={{ flex:1,minWidth:140,padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14 }}>
          <option value="">Destination</option>{MAJOR_CITIES.filter(c=>c!==from).map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14 }}/>
        <select value={pax} onChange={e=>setPax(e.target.value)} style={{ padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14 }}>
          {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} passager{n>1?'s':''}</option>)}
        </select>
        <button onClick={()=>doSearch(from,to,date,pax)} style={{ padding:'10px 28px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:800,cursor:'pointer' }}>Rechercher</button>
      </div>
      <div style={{ maxWidth:900,margin:'0 auto',padding:'20px' }}>
        {loading && <div style={{ textAlign:'center',padding:40 }}>⏳ Recherche…</div>}
        {error && <div style={{ background:'#FEF2F2',borderRadius:12,padding:16,color:'#DC2626' }}>⚠️ {error}</div>}
        {filtered.map(trip=>(
          <BlaCard key={trip.id} trip={trip} selected={selected===trip.id} booked={!!booking[trip.id]}
            onSelect={()=>setSelected(selected===trip.id?null:trip.id)} onBook={()=>handleBook(trip.id)} user={user} navigate={navigate}/>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  BlaCard — Carte trajet style BlaBlaCar
// ═══════════════════════════════════════════════════════════════
function BlaCard({ trip, selected, booked, onSelect, onBook, user, navigate }) {
  const depTime = trip.departure_time ? new Date(trip.departure_time) : null
  const validDep = depTime && !isNaN(depTime)

  // Calculer heure arrivée depuis durée si arrivée pas fournie
  let arrTime = null
  if (trip.arrival_time) {
    const a = new Date(trip.arrival_time)
    if (!isNaN(a)) arrTime = a
  } else if (validDep && trip.duration) {
    // duration "2h00" → heure arrivée
    const m = trip.duration.match(/(\d+)h(\d+)?/)
    if (m) {
      const h = parseInt(m[1]), min = parseInt(m[2] || 0)
      arrTime = new Date(depTime.getTime() + (h * 3600 + min * 60) * 1000)
    }
  }

  const isNight = validDep && (depTime.getHours() >= 20 || depTime.getHours() < 6)
  const price   = Number(trip.price_per_seat) || 0

  return (
    <div onClick={onSelect} style={{
      background:'#fff', borderRadius:20, marginBottom:10,
      border: selected ? '2.5px solid #1A9E8A' : '1.5px solid transparent',
      overflow:'hidden', cursor:'pointer',
      boxShadow: selected ? '0 4px 20px rgba(26,158,138,.1)' : '0 1px 6px rgba(0,0,0,.06)',
    }}>
      <div style={{ padding:'18px 18px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>

          {/* Heures */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:0, flexShrink:0, minWidth:56 }}>
            <span style={{ fontSize:17, fontWeight:800, color:'#111827', lineHeight:1 }}>
              {fmtTime(trip.departure_time)}
            </span>
            {trip.duration && (
              <span style={{ fontSize:11, color:'#9CA3AF', marginTop:4 }}>
                {trip.duration}{isNight ? ' 🌙' : ''}
              </span>
            )}
            {arrTime && (
              <span style={{ fontSize:17, fontWeight:800, color:'#111827', marginTop: trip.duration ? 22 : 30, lineHeight:1 }}>
                {fmtTime(arrTime.toISOString())}
              </span>
            )}
          </div>

          {/* Timeline */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:3, flexShrink:0 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', border:'2px solid #374151', background:'#fff' }}/>
            <div style={{ width:2, height: arrTime ? 40 : 20, background:'#D1D5DB', margin:'3px 0' }}/>
            {arrTime && <div style={{ width:10, height:10, borderRadius:'50%', border:'2px solid #374151', background:'#fff' }}/>}
          </div>

          {/* Villes */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#111827', lineHeight:1, paddingTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {trip.origin_city || '—'}
            </div>
            {arrTime && (
              <div style={{ fontSize:16, fontWeight:700, color:'#111827', marginTop:36, lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {trip.destination_city || '—'}
              </div>
            )}
          </div>

          {/* Prix */}
          <div style={{ flexShrink:0, textAlign:'right' }}>
            <span style={{ fontSize:22, fontWeight:900, color:'#111827', letterSpacing:'-.03em' }}>
              {price.toLocaleString('fr-FR')}
            </span>
            <span style={{ fontSize:13, fontWeight:700, color:'#111827' }}> FCFA</span>
          </div>
        </div>
      </div>

      <div style={{ height:1, background:'#F3F4F6', margin:'0 18px' }}/>

      {/* Conducteur */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px' }}>
        <span style={{ fontSize:18, color:'#9CA3AF' }}>🚗</span>
        {trip.driver_avatar_url ? (
          <img src={trip.driver_avatar_url} alt="" onError={e=>{e.target.style.display='none'}}
            style={{ width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #E5E7EB' }}/>
        ) : (
          <div style={{ width:36,height:36,borderRadius:'50%',background:trip.driver_avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:'#fff',flexShrink:0 }}>
            {trip.driver_avatar}
          </div>
        )}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:14,fontWeight:700,color:'#111827' }}>{trip.driver_name}</div>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:2 }}>
            <span style={{ fontSize:12,color:'#F59E0B' }}>★ {trip.driver_rating.toFixed(1)}</span>
            {trip.driver_verified && (
              <span style={{ background:'#EEF2FF',color:'#4F46E5',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10 }}>Vérifié</span>
            )}
          </div>
        </div>
        <div style={{ flexShrink:0,display:'flex',alignItems:'center',gap:4,color:'#9CA3AF' }}>
          {'👤'.repeat(Math.min(trip.available_seats, 3))}
          {trip.available_seats > 3 && <span style={{ fontSize:11,fontWeight:700 }}>+{trip.available_seats-3}</span>}
        </div>
      </div>

      {selected && (
        <div style={{ borderTop:'1px solid #F3F4F6',padding:'12px 18px',display:'flex',gap:10 }}>
          <button
            onClick={e=>{e.stopPropagation(); if(!user){navigate('/login')}else{onBook()}}}
            disabled={booked||!trip.available_seats}
            style={{ flex:1,padding:'13px',border:'none',borderRadius:14,background:booked?'#9CA3AF':!trip.available_seats?'#E5E7EB':'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',fontSize:15,fontWeight:800,cursor:booked||!trip.available_seats?'not-allowed':'pointer',fontFamily:'inherit' }}>
            {booked ? '✓ Envoyée' : !trip.available_seats ? 'Complet' : 'Réserver'}
          </button>
          <Link to={user?`/messages?trip=${trip.id}`:'/login'} onClick={e=>e.stopPropagation()}
            style={{ padding:'13px 18px',border:'1.5px solid #E5E7EB',borderRadius:14,fontSize:18,color:'#374151',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center' }}>
            💬
          </Link>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  SearchSheet
// ═══════════════════════════════════════════════════════════════
function SearchSheet({ from, setFrom, to, setTo, date, setDate, pax, setPax, onSearch, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:8000 }}/>
      <div style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:8001,background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 20px 40px',maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 8px' }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'#E5E7EB' }}/>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <h3 style={{ fontSize:18,fontWeight:900,margin:0,color:'#111827' }}>Modifier la recherche</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#9CA3AF' }}>✕</button>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {[
            { label:'Départ', value:from, set:setFrom, exclude:to },
            { label:'Destination', value:to, set:setTo, exclude:from },
          ].map(f => (
            <div key={f.label}>
              <p style={{ fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 6px' }}>{f.label}</p>
              <select value={f.value} onChange={e=>f.set(e.target.value)} style={{ width:'100%',padding:'13px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',color:f.value?'#111827':'#9CA3AF',boxSizing:'border-box' }}>
                <option value="">{f.label}</option>
                {MAJOR_CITIES.filter(c=>c!==f.exclude).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
          <div>
            <p style={{ fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 6px' }}>Date</p>
            <input type="date" value={date} min={today} onChange={e=>setDate(e.target.value)} style={{ width:'100%',padding:'13px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}/>
          </div>
          <div>
            <p style={{ fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 6px' }}>Passagers</p>
            <select value={pax} onChange={e=>setPax(e.target.value)} style={{ width:'100%',padding:'13px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box' }}>
              {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} adulte{n>1?'s':''}</option>)}
            </select>
          </div>
          <button onClick={onSearch} style={{ width:'100%',padding:'16px',border:'none',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',marginTop:4 }}>
            Rechercher
          </button>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
//  FiltersSheet
// ═══════════════════════════════════════════════════════════════
function FiltersSheet({ maxPrice, setMaxPrice, timeSlot, setTimeSlot, activePrefs, setActivePrefs, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:8000 }}/>
      <div style={{ position:'fixed',bottom:0,left:0,right:0,zIndex:8001,background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 20px 40px',maxHeight:'85vh',overflowY:'auto' }}>
        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 8px' }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'#E5E7EB' }}/>
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
          <h3 style={{ fontSize:18,fontWeight:900,margin:0,color:'#111827' }}>Filtres</h3>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#9CA3AF' }}>✕</button>
        </div>
        <div style={{ marginBottom:28 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
            <p style={{ fontSize:15,fontWeight:800,color:'#111827',margin:0 }}>Prix maximum</p>
            <span style={{ fontSize:14,fontWeight:800,color:'#1A9E8A' }}>{Number(maxPrice).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <input type="range" min={1000} max={20000} step={500} value={maxPrice} onChange={e=>setMaxPrice(+e.target.value)} style={{ width:'100%',accentColor:'#1A9E8A' }}/>
        </div>
        <div style={{ marginBottom:28 }}>
          <p style={{ fontSize:15,fontWeight:800,color:'#111827',margin:'0 0 12px' }}>Heure de départ</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {[{v:'all',l:'Toutes',i:'🕐'},{v:'morning',l:'Matin',i:'🌅'},{v:'afternoon',l:'Après-midi',i:'☀️'},{v:'evening',l:'Soir',i:'🌙'}].map(s=>(
              <button key={s.v} onClick={()=>setTimeSlot(s.v)} style={{ padding:'12px',borderRadius:14,border:timeSlot===s.v?'2px solid #111827':'1.5px solid #E5E7EB',background:timeSlot===s.v?'#F3F4F6':'#F7F8FA',color:'#111827',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                {s.i} {s.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:28 }}>
          <p style={{ fontSize:15,fontWeight:800,color:'#111827',margin:'0 0 12px' }}>Préférences</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
            {PREF_FILTERS.map(p=>(
              <button key={p.id} onClick={()=>setActivePrefs(a=>a.includes(p.id)?a.filter(x=>x!==p.id):[...a,p.id])} style={{ padding:'12px',borderRadius:14,border:activePrefs.includes(p.id)?'2px solid #1A9E8A':'1.5px solid #E5E7EB',background:activePrefs.includes(p.id)?'#E8F7F4':'#F7F8FA',color:activePrefs.includes(p.id)?'#1A9E8A':'#374151',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                {p.icon} {p.id}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{ width:'100%',padding:'16px',border:'none',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer' }}>
          Appliquer
        </button>
      </div>
    </>
  )
}
