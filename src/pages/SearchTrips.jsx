import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMobile'
import { API_URL, authFetch } from '../utils/api'
import { POPULAR_ROUTES, MAJOR_CITIES } from '../data/cameroun'
import TripMapEmbed from '../components/TripMapEmbed'

// ─── helpers ────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  if (isNaN(d)) return '--:--'
  return `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
}
const fmtFull = (iso) => {
  if (!iso) return "Aujourd'hui"
  const d = new Date(iso)
  if (isNaN(d)) return "Aujourd'hui"
  return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})
}

// Normalise camelCase (API v2) → snake_case (frontend)
const norm = (t) => ({
  id:                t.id,
  origin_city:       t.from              || t.origin_city        || '',
  destination_city:  t.to                || t.destination_city   || '',
  departure_time:    t.departureAt       || t.departure_time     || null,
  arrival_time:      t.estimatedArrival  || t.arrival_time       || null,
  price_per_seat:    Number(t.price      ?? t.price_per_seat     ?? 0),
  available_seats:   parseInt(t.remaining ?? t.availableSeats    ?? t.available_seats ?? 0),
  preferences:       t.prefs             || t.preferences        || [],
  duration:          t.duration          || '',
  driver_id:         t.driverId          || t.driver_id          || null,
  driver_name:       t.driverName        || `${t.driverFirstName||''} ${t.driverLastName||''}`.trim() || 'Conducteur',
  driver_avatar:     t.driverAvatar      || (t.driverFirstName?.[0]||'?').toUpperCase(),
  driver_avatar_url: t.driverAvatarUrl   || t.driver_avatar_url  || null,
  driver_avatar_color: t.driverColor     || t.driver_avatar_color|| '#1A9E8A',
  driver_rating:     Number(t.driverRating ?? t.driver_rating    ?? 0),
  driver_reviews:    Number(t.driverReviews ?? t.driver_reviews  ?? 0),
  driver_verified:   t.driverVerified    || t.driver_verified    || false,
})

const PREFS = [
  { id:'Climatisé',    icon:'❄️' },
  { id:'Musique ok',   icon:'🎵' },
  { id:'Animaux ok',   icon:'🐾' },
  { id:'Silencieux',   icon:'🤫' },
  { id:'Non-fumeur',   icon:'🚭' },
  { id:'Chargeur USB', icon:'🔌' },
]

// ════════════════════════════════════════════════════════════
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
  const [selected,    setSelected]    = useState(null)
  const [booking,     setBooking]     = useState({})
  const [bookMsg,     setBookMsg]     = useState('')

  // Filtres
  const [maxPrice,    setMaxPrice]    = useState(20000)
  const [sortBy,      setSortBy]      = useState('departure')
  const [timeSlot,    setTimeSlot]    = useState('all')
  const [activePrefs, setActivePrefs] = useState([])
  const [panel,       setPanel]       = useState(null) // mobile: 'search'|'filters'

  const doSearch = useCallback(async (f, t, d, p) => {
    setLoading(true); setError(''); setHasSearched(true); setSelected(null)
    try {
      const q = new URLSearchParams()
      if (f) q.set('from', f); if (t) q.set('to', t)
      if (d) q.set('date', d); if (p) q.set('passengers', p)
      const res  = await authFetch(`${API_URL}/api/trips/search?${q}`, {})
      const data = await res.json()
      const raw  = data.trips || data.results || (Array.isArray(data) ? data : [])
      setTrips(raw.map(norm))
    } catch { setError('Impossible de contacter le serveur.') }
    finally  { setLoading(false) }
  }, [])

  // Lancer la recherche automatiquement si params URL présents
  const urlFrom = urlParams.get('from')
  const urlTo   = urlParams.get('to')
  const urlDate = urlParams.get('date') || ''
  const urlPax  = urlParams.get('passengers') || '1'

  useEffect(() => {
    if (urlFrom && urlTo) {
      setFrom(urlFrom); setTo(urlTo); setDate(urlDate); setPax(urlPax)
      doSearch(urlFrom, urlTo, urlDate, urlPax)
    }
  }, [urlFrom, urlTo])

  const filtered = trips.filter(t => {
    if (t.price_per_seat > maxPrice) return false
    if (activePrefs.length && !activePrefs.every(p => t.preferences?.includes(p))) return false
    if (timeSlot !== 'all' && t.departure_time) {
      const h = new Date(t.departure_time).getHours()
      if (timeSlot === 'morning'   && !(h>=5  && h<12)) return false
      if (timeSlot === 'afternoon' && !(h>=12 && h<18)) return false
      if (timeSlot === 'evening'   && h<18) return false
    }
    return true
  }).sort((a,b) => {
    if (sortBy === 'price')  return a.price_per_seat - b.price_per_seat
    if (sortBy === 'rating') return (b.driver_rating||0)-(a.driver_rating||0)
    return new Date(a.departure_time)-new Date(b.departure_time)
  })

  const handleBook = async (tripId) => {
    if (!user) { navigate('/login'); return }
    try {
      const res  = await authFetch(`${API_URL}/api/trips/${tripId}/book`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ seats: parseInt(pax) }),
      })
      const data = await res.json()
      setBookMsg(data.message || (data.success ? 'Demande envoyée !' : 'Erreur'))
      if (data.success) setBooking(b=>({...b,[tripId]:true}))
      setTimeout(()=>setBookMsg(''), 3000)
    } catch { setBookMsg('Erreur.'); setTimeout(()=>setBookMsg(''),2000) }
  }

  const nbFilters = (maxPrice<20000?1:0)+(timeSlot!=='all'?1:0)+activePrefs.length

  // ══════════════════════════════════════════════════════════
  //  MOBILE
  // ══════════════════════════════════════════════════════════
  if (isMobile) return (
    <div style={{background:'#ECEEF3',minHeight:'100vh',fontFamily:"-apple-system,'SF Pro Display',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {bookMsg && <Toast msg={bookMsg}/>}

      <div style={{background:'#fff',paddingTop:8}}>
        {/* Header retour + résumé */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px 10px'}}>
          <button onClick={()=>navigate('/')}
            style={{background:'none',border:'none',fontSize:26,cursor:'pointer',color:'#111',padding:0,lineHeight:1}}>‹</button>
          <button onClick={()=>setPanel('search')}
            style={{flex:1,background:'#F2F3F7',border:'none',borderRadius:16,padding:'10px 14px',textAlign:'left',cursor:'pointer',fontFamily:'inherit'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {from&&to ? `${from} → ${to}` : 'Où allez-vous ?'}
            </div>
            <div style={{fontSize:12,color:'#6B7280',marginTop:2}}>
              {fmtFull(date)} · {pax} adulte{parseInt(pax)>1?'s':''}
            </div>
          </button>
        </div>

        {/* Onglets */}
        <div style={{display:'flex'}}>
          {[
            {label:'Tout',count:hasSearched?filtered.length:null},
            {label:'Covoiturage',count:hasSearched?filtered.length:null},
            {label:'Bus',count:null},{label:'Train',count:null},
          ].map((tab,i)=>(
            <div key={tab.label} style={{flex:1,textAlign:'center',padding:'10px 0 14px',borderBottom:i===0?'3px solid #111827':'3px solid transparent'}}>
              <div style={{fontSize:14,fontWeight:i===0?800:500,color:i===0?'#111827':'#9CA3AF'}}>{tab.label}</div>
              <div style={{fontSize:12,fontWeight:700,color:i===0?'#111827':'#C4C9D4',marginTop:1}}>
                {tab.count!==null?tab.count:'—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres rapides */}
      <div style={{display:'flex',gap:8,padding:'12px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
        {[
          {fn:()=>setPanel('filters'),label:`⚙️ Filtres${nbFilters>0?' ('+nbFilters+')':''}`,on:nbFilters>0},
          {fn:()=>setSortBy('departure'),label:'⏰ Heure',on:sortBy==='departure'},
          {fn:()=>setSortBy('price'),label:'💰 Prix',on:sortBy==='price'},
          {fn:()=>setSortBy('rating'),label:'⭐ Note',on:sortBy==='rating'},
        ].map((b,i)=>(
          <button key={i} onClick={b.fn} style={{flexShrink:0,padding:'8px 14px',borderRadius:20,border:'none',
            background:b.on?'#111827':'#fff',color:b.on?'#fff':'#374151',
            fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
            {b.label}
          </button>
        ))}
      </div>

      {/* Résultats */}
      <div style={{padding:'0 16px 100px'}}>
        {loading && <Spinner/>}
        {error && <ErrBox msg={error}/>}
        {!loading&&!hasSearched && <EmptySearch/>}
        {!loading&&hasSearched&&filtered.length===0 && <NoResult/>}
        {!loading&&filtered.length>0 && (
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',margin:'16px 0 10px',letterSpacing:'-.02em'}}>
            {fmtFull(date)}
          </h2>
        )}
        {!loading&&filtered.map(t=>(
          <BlaCard key={t.id} trip={t} selected={selected===t.id} booked={!!booking[t.id]}
            onSelect={()=>setSelected(selected===t.id?null:t.id)}
            onBook={()=>handleBook(t.id)} user={user} navigate={navigate}/>
        ))}
      </div>

      {panel==='search' && <SearchSheet from={from} setFrom={setFrom} to={to} setTo={setTo}
        date={date} setDate={setDate} pax={pax} setPax={setPax}
        onSearch={()=>{setPanel(null);doSearch(from,to,date,pax)}} onClose={()=>setPanel(null)}/>}
      {panel==='filters' && <FiltersSheet maxPrice={maxPrice} setMaxPrice={setMaxPrice}
        timeSlot={timeSlot} setTimeSlot={setTimeSlot}
        activePrefs={activePrefs} setActivePrefs={setActivePrefs} onClose={()=>setPanel(null)}/>}
    </div>
  )

  // ══════════════════════════════════════════════════════════
  //  DESKTOP — avec sidebar filtres + cartes
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{background:'#F7F5F2',minHeight:'calc(100vh - 72px)',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      {bookMsg && <Toast msg={bookMsg} fixed/>}

      {/* Barre de recherche */}
      <div style={{background:'#fff',padding:'18px 24px',borderBottom:'1px solid #E5E7EB',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={()=>navigate('/')} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#374151',padding:'0 4px'}}>‹</button>
        <select value={from} onChange={e=>setFrom(e.target.value)}
          style={{flex:1,minWidth:130,padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',color:from?'#111':'#9CA3AF'}}>
          <option value="">🏙 Départ</option>
          {MAJOR_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{color:'#9CA3AF',fontWeight:700,fontSize:18}}>→</span>
        <select value={to} onChange={e=>setTo(e.target.value)}
          style={{flex:1,minWidth:130,padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none',color:to?'#111':'#9CA3AF'}}>
          <option value="">📍 Destination</option>
          {MAJOR_CITIES.filter(c=>c!==from).map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          style={{padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none'}}/>
        <select value={pax} onChange={e=>setPax(e.target.value)}
          style={{padding:'11px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,fontFamily:'inherit',outline:'none'}}>
          {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} passager{n>1?'s':''}</option>)}
        </select>
        <button onClick={()=>doSearch(from,to,date,pax)}
          style={{padding:'11px 28px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
          Rechercher
        </button>
      </div>

      <div style={{display:'flex',maxWidth:1200,margin:'0 auto',padding:'24px',gap:24}}>

        {/* ── Sidebar filtres ── */}
        <aside style={{width:260,flexShrink:0,alignSelf:'flex-start',position:'sticky',top:90}}>
          <div style={{background:'#fff',borderRadius:18,border:'1px solid #E5E7EB',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h3 style={{fontSize:15,fontWeight:800,margin:0,color:'#111'}}>Filtres</h3>
              {nbFilters>0 && (
                <button onClick={()=>{setMaxPrice(20000);setTimeSlot('all');setActivePrefs([])}}
                  style={{background:'none',border:'none',fontSize:12,color:'#1A9E8A',fontWeight:700,cursor:'pointer'}}>
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Prix */}
            <div style={{padding:'18px 20px',borderBottom:'1px solid #F3F4F6'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:0}}>Prix maximum</p>
                <span style={{fontSize:13,fontWeight:800,color:'#1A9E8A'}}>{Number(maxPrice).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <input type="range" min={1000} max={20000} step={500} value={maxPrice}
                onChange={e=>setMaxPrice(+e.target.value)}
                style={{width:'100%',accentColor:'#1A9E8A',height:6}}/>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#9CA3AF',marginTop:4}}>
                <span>1 000</span><span>20 000 FCFA</span>
              </div>
            </div>

            {/* Tri */}
            <div style={{padding:'18px 20px',borderBottom:'1px solid #F3F4F6'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:'0 0 10px'}}>Trier par</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[{v:'departure',l:'⏰ Heure de départ'},{v:'price',l:'💰 Prix croissant'},{v:'rating',l:'⭐ Meilleure note'}].map(s=>(
                  <button key={s.v} onClick={()=>setSortBy(s.v)}
                    style={{textAlign:'left',padding:'9px 12px',borderRadius:10,border:sortBy===s.v?'2px solid #1A9E8A':'1px solid #E5E7EB',background:sortBy===s.v?'#E8F7F4':'transparent',color:sortBy===s.v?'#0f766e':'#374151',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Heure */}
            <div style={{padding:'18px 20px',borderBottom:'1px solid #F3F4F6'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:'0 0 10px'}}>Heure de départ</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[{v:'all',l:'Toutes',i:'🕐'},{v:'morning',l:'Matin',i:'🌅'},{v:'afternoon',l:'Après-midi',i:'☀️'},{v:'evening',l:'Soir',i:'🌙'}].map(s=>(
                  <button key={s.v} onClick={()=>setTimeSlot(s.v)}
                    style={{padding:'9px 6px',borderRadius:10,border:timeSlot===s.v?'2px solid #1A9E8A':'1px solid #E5E7EB',background:timeSlot===s.v?'#E8F7F4':'transparent',color:timeSlot===s.v?'#0f766e':'#374151',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                    {s.i} {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Préférences */}
            <div style={{padding:'18px 20px'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#374151',margin:'0 0 10px'}}>Préférences</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                {PREFS.map(p=>(
                  <button key={p.id} onClick={()=>setActivePrefs(a=>a.includes(p.id)?a.filter(x=>x!==p.id):[...a,p.id])}
                    style={{padding:'7px 11px',borderRadius:20,border:activePrefs.includes(p.id)?'2px solid #1A9E8A':'1px solid #E5E7EB',background:activePrefs.includes(p.id)?'#E8F7F4':'transparent',color:activePrefs.includes(p.id)?'#0f766e':'#374151',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {p.icon} {p.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Résultats ── */}
        <div style={{flex:1,minWidth:0}}>
          {loading && <Spinner/>}
          {error && <ErrBox msg={error}/>}

          {!loading&&!hasSearched && (
            <div style={{textAlign:'center',padding:'80px 20px',background:'#fff',borderRadius:18,border:'1px solid #E5E7EB'}}>
              <div style={{fontSize:56,marginBottom:16}}>🚗</div>
              <p style={{fontSize:18,fontWeight:800,color:'#374151',margin:'0 0 8px'}}>Trouvez votre prochain trajet</p>
              <p style={{fontSize:14,color:'#9CA3AF'}}>Entrez un départ et une destination pour commencer</p>
            </div>
          )}

          {!loading&&hasSearched&&filtered.length===0 && (
            <div style={{textAlign:'center',padding:'80px 20px',background:'#fff',borderRadius:18,border:'1px solid #E5E7EB'}}>
              <div style={{fontSize:48,marginBottom:16}}>😔</div>
              <p style={{fontSize:18,fontWeight:800,color:'#374151',margin:'0 0 8px'}}>Aucun trajet disponible</p>
              <p style={{fontSize:14,color:'#9CA3AF'}}>Essayez une autre date ou élargissez vos filtres</p>
              {nbFilters>0&&<button onClick={()=>{setMaxPrice(20000);setTimeSlot('all');setActivePrefs([])}}
                style={{marginTop:20,padding:'12px 24px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:30,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                Réinitialiser les filtres
              </button>}
            </div>
          )}

          {!loading&&filtered.length>0 && (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <p style={{fontSize:14,color:'#6B7280',margin:0,fontWeight:600}}>
                  <strong style={{color:'#111'}}>{filtered.length}</strong> trajet{filtered.length>1?'s':''} · {fmtFull(date)}
                </p>
              </div>
              {filtered.map(t=>(
                <BlaCard key={t.id} trip={t} selected={selected===t.id} booked={!!booking[t.id]}
                  onSelect={()=>setSelected(selected===t.id?null:t.id)}
                  onBook={()=>handleBook(t.id)} user={user} navigate={navigate}/>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  BlaCard — même carte mobile/desktop
// ════════════════════════════════════════════════════════════
function BlaCard({ trip, selected, booked, onSelect, onBook, user, navigate }) {
  const depTime = trip.departure_time ? new Date(trip.departure_time) : null
  const validDep = depTime && !isNaN(depTime)
  let arrTime = null
  if (trip.arrival_time) { const a=new Date(trip.arrival_time); if(!isNaN(a)) arrTime=a }
  else if (validDep && trip.duration) {
    const m = trip.duration.match(/(\d+)h(\d+)?/)
    if (m) arrTime = new Date(depTime.getTime()+(parseInt(m[1])*3600+parseInt(m[2]||0)*60)*1000)
  }
  const isNight = validDep && (depTime.getHours()>=20||depTime.getHours()<6)
  const price   = Number(trip.price_per_seat)||0

  return (
    <div onClick={onSelect} style={{
      background:'#fff',borderRadius:18,marginBottom:12,cursor:'pointer',
      border:selected?'2.5px solid #1A9E8A':'1.5px solid #E5E7EB',
      boxShadow:selected?'0 4px 20px rgba(26,158,138,.12)':'0 1px 4px rgba(0,0,0,.04)',
      transition:'box-shadow .2s,border-color .2s',overflow:'hidden',
    }}>
      <div style={{padding:'20px 20px 16px'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:16}}>

          {/* Heures + durée */}
          <div style={{flexShrink:0,minWidth:56,display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
            <span style={{fontSize:18,fontWeight:800,color:'#111',lineHeight:1}}>{fmtTime(trip.departure_time)}</span>
            {trip.duration&&<span style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>{trip.duration}{isNight?' 🌙':''}</span>}
            {arrTime&&<span style={{fontSize:18,fontWeight:800,color:'#111',marginTop:trip.duration?20:28,lineHeight:1}}>{fmtTime(arrTime.toISOString())}</span>}
          </div>

          {/* Timeline */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:4,flexShrink:0}}>
            <div style={{width:11,height:11,borderRadius:'50%',border:'2.5px solid #374151',background:'#fff'}}/>
            <div style={{width:2,height:arrTime?44:20,background:'#D1D5DB',margin:'3px 0'}}/>
            {arrTime&&<div style={{width:11,height:11,borderRadius:'50%',border:'2.5px solid #374151',background:'#fff'}}/>}
          </div>

          {/* Villes */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:17,fontWeight:700,color:'#111',lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {trip.origin_city||'—'}
            </div>
            {arrTime&&<div style={{fontSize:17,fontWeight:700,color:'#111',marginTop:38,lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {trip.destination_city||'—'}
            </div>}
          </div>

          {/* Prix */}
          <div style={{flexShrink:0,textAlign:'right'}}>
            <div style={{fontSize:24,fontWeight:900,color:'#111',letterSpacing:'-.03em',lineHeight:1}}>{price.toLocaleString('fr-FR')}</div>
            <div style={{fontSize:13,color:'#6B7280',fontWeight:600}}>FCFA</div>
          </div>
        </div>
      </div>

      <div style={{height:1,background:'#F3F4F6',margin:'0 20px'}}/>

      {/* Conducteur */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'13px 20px'}}>
        <span style={{fontSize:16,color:'#C4C9D4'}}>🚗</span>
        {trip.driver_avatar_url
          ? <img src={trip.driver_avatar_url} alt="" onError={e=>e.target.style.display='none'}
              style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',border:'2px solid #F3F4F6'}}/>
          : <div style={{width:36,height:36,borderRadius:'50%',background:trip.driver_avatar_color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:'#fff',flexShrink:0}}>{trip.driver_avatar}</div>
        }
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:'#111'}}>{trip.driver_name}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2}}>
            <span style={{fontSize:12,color:'#F59E0B',fontWeight:700}}>★ {trip.driver_rating.toFixed(1)}</span>
            {trip.driver_reviews>0&&<span style={{fontSize:11,color:'#9CA3AF'}}>({trip.driver_reviews} avis)</span>}
            {trip.driver_verified&&<span style={{background:'#EEF2FF',color:'#4F46E5',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10}}>Vérifié</span>}
          </div>
        </div>
        {/* Places disponibles */}
        <div style={{flexShrink:0,background:trip.available_seats>0?'#E8F7F4':'#FEF2F2',color:trip.available_seats>0?'#0f766e':'#DC2626',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:700}}>
          {trip.available_seats>0 ? `${trip.available_seats} place${trip.available_seats>1?'s':''}` : 'Complet'}
        </div>
      </div>

      {/* Préférences */}
      {trip.preferences?.length>0 && (
        <div style={{display:'flex',gap:6,padding:'0 20px 14px',flexWrap:'wrap'}}>
          {trip.preferences.map(p=>{
            const pf = PREFS.find(f=>f.id===p)
            return pf ? <span key={p} style={{background:'#F7F8FA',borderRadius:20,padding:'4px 10px',fontSize:11,color:'#6B7280',fontWeight:600}}>{pf.icon} {p}</span> : null
          })}
        </div>
      )}

      {/* Actions si sélectionné */}
      {selected&&(
        <>
          {/* Carte du trajet avec itinéraire */}
          <TripMapEmbed
            origin={trip.origin_city ? { name: trip.origin_city } : null}
            destination={trip.destination_city ? { name: trip.destination_city } : null}
            trip={trip}
            height={240}
          />
          <div style={{borderTop:'1px solid #F3F4F6',padding:'14px 20px',display:'flex',gap:10}}>
            <button
              onClick={e=>{e.stopPropagation();if(!user){navigate('/login')}else{onBook()}}}
              disabled={booked||!trip.available_seats}
              style={{flex:1,padding:'13px',border:'none',borderRadius:14,
                background:booked?'#9CA3AF':!trip.available_seats?'#E5E7EB':'linear-gradient(135deg,#1A9E8A,#22C6AD)',
                color:'#fff',fontSize:15,fontWeight:800,
                cursor:booked||!trip.available_seats?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {booked?'✓ Demande envoyée':!trip.available_seats?'Complet':'Réserver ce trajet'}
            </button>
            <Link to={user?`/messages?trip=${trip.id}`:'/login'} onClick={e=>e.stopPropagation()}
              style={{padding:'13px 18px',border:'1.5px solid #E5E7EB',borderRadius:14,fontSize:18,color:'#374151',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
              💬
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

// ── Petits composants réutilisables ──────────────────────────
function Toast({ msg, fixed }) {
  return (
    <div style={{position:'fixed',top:fixed?80:16,left:fixed?'50%':16,right:fixed?'auto':16,
      transform:fixed?'translateX(-50%)':undefined,zIndex:9999,
      background:'#1A9E8A',color:'#fff',borderRadius:14,padding:'14px 20px',
      fontWeight:700,fontSize:14,textAlign:'center',boxShadow:'0 8px 24px rgba(0,0,0,.2)',
      whiteSpace:'nowrap'}}>
      {msg}
    </div>
  )
}
function Spinner() {
  return (
    <div style={{textAlign:'center',padding:'60px 0'}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid #E5E7EB',borderTopColor:'#1A9E8A',margin:'0 auto 12px',animation:'spin .8s linear infinite'}}/>
      <p style={{color:'#6B7280',fontSize:14}}>Recherche en cours…</p>
    </div>
  )
}
function ErrBox({ msg }) {
  return <div style={{background:'#FEF2F2',borderRadius:14,padding:16,color:'#DC2626',fontSize:14,marginBottom:12}}>⚠️ {msg}</div>
}
function EmptySearch() {
  return (
    <div style={{textAlign:'center',padding:'80px 0'}}>
      <div style={{fontSize:52,marginBottom:16}}>🚗</div>
      <p style={{fontSize:16,fontWeight:700,color:'#374151',margin:'0 0 6px'}}>Trouvez votre trajet</p>
      <p style={{fontSize:14,color:'#9CA3AF'}}>Entrez un départ et une destination</p>
    </div>
  )
}
function NoResult() {
  return (
    <div style={{textAlign:'center',padding:'60px 0'}}>
      <div style={{fontSize:48,marginBottom:16}}>😔</div>
      <p style={{fontSize:17,fontWeight:800,color:'#111827',margin:'0 0 8px'}}>Aucun trajet disponible</p>
      <p style={{fontSize:14,color:'#9CA3AF'}}>Essayez une autre date</p>
    </div>
  )
}

// ── SearchSheet mobile ──────────────────────────────────────
function SearchSheet({ from,setFrom,to,setTo,date,setDate,pax,setPax,onSearch,onClose }) {
  const today = new Date().toISOString().split('T')[0]
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:8000}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:8001,background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 20px 40px',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 8px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:'#E5E7EB'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <h3 style={{fontSize:18,fontWeight:900,margin:0}}>Modifier la recherche</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#9CA3AF'}}>✕</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {[{label:'Départ',value:from,set:setFrom,excl:to},{label:'Destination',value:to,set:setTo,excl:from}].map(f=>(
            <div key={f.label}>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 6px'}}>{f.label}</p>
              <select value={f.value} onChange={e=>f.set(e.target.value)}
                style={{width:'100%',padding:'13px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box',color:f.value?'#111':'#9CA3AF'}}>
                <option value="">{f.label}</option>
                {MAJOR_CITIES.filter(c=>c!==f.excl).map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
          <div>
            <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 6px'}}>Date</p>
            <input type="date" value={date} min={today} onChange={e=>setDate(e.target.value)}
              style={{width:'100%',padding:'13px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div>
            <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 6px'}}>Passagers</p>
            <select value={pax} onChange={e=>setPax(e.target.value)}
              style={{width:'100%',padding:'13px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:15,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}>
              {[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} adulte{n>1?'s':''}</option>)}
            </select>
          </div>
          <button onClick={onSearch}
            style={{width:'100%',padding:'16px',border:'none',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>
            Rechercher
          </button>
        </div>
      </div>
    </>
  )
}

// ── FiltersSheet mobile ──────────────────────────────────────
function FiltersSheet({ maxPrice,setMaxPrice,timeSlot,setTimeSlot,activePrefs,setActivePrefs,onClose }) {
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:8000}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:8001,background:'#fff',borderRadius:'24px 24px 0 0',padding:'0 20px 40px',maxHeight:'85vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'center',padding:'12px 0 8px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:'#E5E7EB'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <h3 style={{fontSize:18,fontWeight:900,margin:0}}>Filtres</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#9CA3AF'}}>✕</button>
        </div>
        <div style={{marginBottom:28}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <p style={{fontSize:15,fontWeight:800,margin:0}}>Prix maximum</p>
            <span style={{fontSize:14,fontWeight:800,color:'#1A9E8A'}}>{Number(maxPrice).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <input type="range" min={1000} max={20000} step={500} value={maxPrice} onChange={e=>setMaxPrice(+e.target.value)}
            style={{width:'100%',accentColor:'#1A9E8A'}}/>
        </div>
        <div style={{marginBottom:28}}>
          <p style={{fontSize:15,fontWeight:800,margin:'0 0 12px'}}>Heure de départ</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[{v:'all',l:'Toutes',i:'🕐'},{v:'morning',l:'Matin',i:'🌅'},{v:'afternoon',l:'Après-midi',i:'☀️'},{v:'evening',l:'Soir',i:'🌙'}].map(s=>(
              <button key={s.v} onClick={()=>setTimeSlot(s.v)}
                style={{padding:'12px',borderRadius:14,border:timeSlot===s.v?'2px solid #111827':'1.5px solid #E5E7EB',background:timeSlot===s.v?'#F3F4F6':'#F7F8FA',color:'#111',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {s.i} {s.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:28}}>
          <p style={{fontSize:15,fontWeight:800,margin:'0 0 12px'}}>Préférences</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {PREFS.map(p=>(
              <button key={p.id} onClick={()=>setActivePrefs(a=>a.includes(p.id)?a.filter(x=>x!==p.id):[...a,p.id])}
                style={{padding:'12px',borderRadius:14,border:activePrefs.includes(p.id)?'2px solid #1A9E8A':'1.5px solid #E5E7EB',background:activePrefs.includes(p.id)?'#E8F7F4':'#F7F8FA',color:activePrefs.includes(p.id)?'#1A9E8A':'#374151',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                {p.icon} {p.id}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose}
          style={{width:'100%',padding:'16px',border:'none',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',borderRadius:16,fontSize:16,fontWeight:800,cursor:'pointer'}}>
          Appliquer
        </button>
      </div>
    </>
  )
}
