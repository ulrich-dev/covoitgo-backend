import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import CityAutocomplete from '../components/CityAutocomplete'
import TripMap from '../components/TripMap'
import ContactModal from '../components/ContactModal'
import { fmtFCFA } from '../data/cameroun'

import { API_URL } from '../utils/api'

const fmt = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
}
const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })
}
const stars = (r) => { const f=Math.round(r||0); return '★'.repeat(f)+'☆'.repeat(5-f) }

const PREF_FILTERS = [
  { id:'Climatisé',    icon:'❄️' },
  { id:'Musique ok',   icon:'🎵' },
  { id:'Animaux ok',   icon:'🐾' },
  { id:'Silencieux',   icon:'🤫' },
  { id:'Non-fumeur',   icon:'🚭' },
  { id:'Chargeur USB', icon:'🔌' },
]

// ── Bloc "Aucun résultat" avec proposition favori/alerte ──────
function NoResultBlock({ from, to, user }) {
  const navigate = useNavigate()
  const { t, lang } = useLang()

  const [favFrom,    setFavFrom]    = useState(from  || '')
  const [favTo,      setFavTo]      = useState(to    || '')
  const [step,       setStep]       = useState('idle')   // idle | form | success
  const [actionType, setActionType] = useState(null)     // 'favorite' | 'alert'
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const handleAction = (type) => {
    if (!user) { navigate('/login'); return }
    setActionType(type)
    setStep('form')
    setError('')
  }

  const handleSubmit = async () => {
    if (!favFrom.trim() || !favTo.trim()) {
      setError('Veuillez sélectionner un départ et une destination.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const endpoint = actionType === 'favorite'
        ? `${API_URL}/api/alerts/favorites`
        : `${API_URL}/api/alerts`

      const body = actionType === 'favorite'
        ? { originCity: favFrom, destinationCity: favTo }
        : { originCity: favFrom, destinationCity: favTo }

      const res  = await fetch(endpoint, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setStep('success')
      } else {
        setError(data.message || 'Une erreur est survenue.')
      }
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background:'#fff', border:'1.5px solid rgba(0,0,0,.07)', borderRadius:16, overflow:'hidden' }}>

      {/* En-tête */}
      <div style={{ background:'linear-gradient(135deg,#F7F5F2,#fff)', padding:'40px 32px 28px', textAlign:'center', borderBottom:'1px solid rgba(0,0,0,.06)' }}>
        <div style={{ fontSize:52, marginBottom:14 }}>🔍</div>
        <h2 style={{ fontSize:19, fontWeight:900, color:'#1A1A1A', margin:'0 0 10px' }}>
          Aucun trajet trouvé
        </h2>
        <p style={{ color:'#94A3B8', fontSize:14, lineHeight:1.7, margin:0 }}>
          {from && to
            ? <>Pas de trajet disponible entre <strong style={{ color:'#1A1A1A' }}>{from}</strong> et <strong style={{ color:'#1A1A1A' }}>{to}</strong> pour le moment.</>
            : <>Aucun trajet ne correspond à votre recherche.</>
          }
        </p>
      </div>

      {/* Contenu selon l'étape */}
      {step === 'idle' && (
        <div style={{ padding:'28px 32px' }}>

          {/* Suggestions */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>

            {/* Favori */}
            <button onClick={() => handleAction('favorite')}
              style={{ background:'#FFF8E7', border:'1.5px solid #F59E0B', borderRadius:14, padding:'20px 18px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF3C7'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFF8E7'}>
              <div style={{ fontSize:28, marginBottom:10 }}>⭐</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#92400E', marginBottom:6 }}>
                Sauvegarder en favori
              </div>
              <div style={{ fontSize:12, color:'#B45309', lineHeight:1.6 }}>
                Soyez notifié dès qu'un conducteur publie ce trajet
              </div>
            </button>

            {/* Alerte */}
            <button onClick={() => handleAction('alert')}
              style={{ background:'#F0FDF4', border:'1.5px solid #1A9E8A', borderRadius:14, padding:'20px 18px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all .18s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#DCFCE7'}
              onMouseLeave={e => e.currentTarget.style.background = '#F0FDF4'}>
              <div style={{ fontSize:28, marginBottom:10 }}>🔔</div>
              <div style={{ fontSize:14, fontWeight:800, color:'#065F46', marginBottom:6 }}>
                Créer une alerte
              </div>
              <div style={{ fontSize:12, color:'#047857', lineHeight:1.6 }}>
                Avec dates et prix max pour un matching précis
              </div>
            </button>
          </div>

          {/* Séparateur */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:'rgba(0,0,0,.08)' }}/>
            <span style={{ fontSize:12, color:'#CBD5E1', fontWeight:600 }}>ou</span>
            <div style={{ flex:1, height:1, background:'rgba(0,0,0,.08)' }}/>
          </div>

          {/* Publier un trajet */}
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:13, color:'#94A3B8', marginBottom:14 }}>
              Vous êtes conducteur ? Proposez ce trajet vous-même !
            </p>
            <Link to="/publish">
              <button style={{ background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none', borderRadius:24, padding:'12px 28px', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                + Publier un trajet
              </button>
            </Link>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div style={{ padding:'28px 32px' }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{actionType === 'favorite' ? '⭐' : '🔔'}</div>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#1A1A1A', margin:'0 0 4px' }}>
              {actionType === 'favorite' ? 'Sauvegarder en favori' : 'Créer une alerte'}
            </h3>
            <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>
              {actionType === 'favorite'
                ? 'Confirmez votre itinéraire pour être notifié à chaque nouveau trajet.'
                : 'Définissez votre trajet pour recevoir une alerte dès qu\'un conducteur publie.'}
            </p>
          </div>

          {/* Champs départ/arrivée */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>
                Départ <span style={{ color:'#EF4444' }}>*</span>
              </label>
              <CityAutocomplete
                value={favFrom}
                onChange={setFavFrom}
                placeholder="Ville de départ"
              />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>
                Destination <span style={{ color:'#EF4444' }}>*</span>
              </label>
              <CityAutocomplete
                value={favTo}
                onChange={setFavTo}
                placeholder="Ville d'arrivée"
              />
            </div>
          </div>

          {error && (
            <div style={{ background:'#FEF2F2', color:'#DC2626', borderRadius:9, padding:'10px 14px', fontSize:13, fontWeight:600, marginBottom:14, display:'flex', gap:8, alignItems:'center' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setStep('idle'); setError('') }}
              style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid rgba(0,0,0,.1)', background:'#F8FAFC', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', color:'#555' }}>
              ← Retour
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex:2, padding:'12px', borderRadius:12, border:'none',
                background: saving ? '#94A3B8' : actionType === 'favorite'
                  ? 'linear-gradient(135deg,#F59E0B,#FBBF24)'
                  : 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
                color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:800, cursor: saving ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saving
                ? <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite' }}/> Enregistrement…</>
                : actionType === 'favorite' ? '⭐ Sauvegarder' : '🔔 Créer l\'alerte'
              }
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div style={{ padding:'40px 32px', textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:16 }}>{actionType === 'favorite' ? '⭐' : '🔔'}</div>
          <h3 style={{ fontSize:17, fontWeight:900, color:'#1A1A1A', marginBottom:10 }}>
            {actionType === 'favorite' ? 'Favori enregistré !' : 'Alerte créée !'}
          </h3>
          <p style={{ fontSize:14, color:'#6B7280', lineHeight:1.7, marginBottom:24 }}>
            {actionType === 'favorite'
              ? <>Vous recevrez un email dès qu'un conducteur publie un trajet <strong>{favFrom} → {favTo}</strong>.</>
              : <>Nous vous alerterons par email dès qu'un trajet <strong>{favFrom} → {favTo}</strong> sera disponible.</>
            }
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => setStep('idle')}
              style={{ padding:'11px 20px', borderRadius:22, border:'1.5px solid rgba(0,0,0,.1)', background:'#F8FAFC', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', color:'#555' }}>
              Retour aux résultats
            </button>
            <Link to="/alerts">
              <button style={{ padding:'11px 20px', borderRadius:22, border:'none', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                Gérer mes alertes →
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SearchTrips() {
  const [urlParams]  = useSearchParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { t, lang }  = useLang()

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
  const [showFilters, setShowFilters] = useState(false)

  const [selected,    setSelected]    = useState(null)
  const [booking,     setBooking]     = useState({})
  const [bookMsg,     setBookMsg]     = useState('')
  const [contactTrip, setContactTrip] = useState(null) // trip à contacter → ouvre le modal

  const doSearch = useCallback(async (f, t, d, p, sort) => {
    setLoading(true); setError(''); setHasSearched(true); setSelected(null)
    try {
      const q = new URLSearchParams()
      if (f) q.set('from', f); if (t) q.set('to', t)
      if (d) q.set('date', d); if (p) q.set('passengers', p)
      q.set('sort', sort || sortBy)
      const res  = await fetch(`${API_URL}/api/trips/search?${q}`, { credentials:'include' })
      const data = await res.json()
      if (data.success) setTrips(data.trips)
      else setError(data.message)
    } catch { setError('Impossible de contacter le serveur.') }
    finally { setLoading(false) }
  }, [sortBy])

  useEffect(() => {
    const f=urlParams.get('from'), t=urlParams.get('to')
    const d=urlParams.get('date'), p=urlParams.get('passengers')||'1'
    if (f||t) { setFrom(f||''); setTo(t||''); setDate(d||''); setPax(p); doSearch(f,t,d,p,'departure') }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = new URLSearchParams()
    if (from) q.set('from', from); if (to) q.set('to', to)
    if (date) q.set('date', date); q.set('passengers', pax)
    navigate(`/search?${q}`)
    doSearch(from, to, date, pax, sortBy)
  }

  const handleSortChange = (s) => { setSortBy(s); if (hasSearched) doSearch(from,to,date,pax,s) }
  const togglePref = (id) => setActivePrefs(p => p.includes(id)?p.filter(x=>x!==id):[...p,id])

  const filtered = trips
    .filter(t => t.price <= maxPrice)
    .filter(t => {
      const h = new Date(t.departureAt).getHours()
      if (timeSlot==='morning')   return h>=5  && h<12
      if (timeSlot==='afternoon') return h>=12 && h<18
      if (timeSlot==='evening')   return h>=18
      return true
    })
    .filter(t => activePrefs.every(p => (t.prefs||[]).includes(p)))

  const handleBook = async (trip) => {
    if (!user) { navigate('/login'); return }
    setBooking(b => ({ ...b, [trip.id]:'loading' }))
    try {
      const res  = await fetch(`${API_URL}/api/trips/${trip.id}/book`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ seatsBooked:1 }),
      })
      const data = await res.json()
      if (data.success) { setBooking(b=>({...b,[trip.id]:'done'})); setBookMsg('✅ Réservation envoyée au conducteur !') }
      else              { setBooking(b=>({...b,[trip.id]:'error'})); setBookMsg(`❌ ${data.message}`) }
    } catch { setBooking(b=>({...b,[trip.id]:'error'})); setBookMsg('❌ Erreur de connexion.') }
    setTimeout(()=>setBookMsg(''), 4000)
  }

  const filterCount = activePrefs.length + (maxPrice<20000?1:0) + (timeSlot!=='all'?1:0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

        .page-bg { flex:1; min-height:calc(100vh - 72px); background:#F7F5F2; font-family:'Plus Jakarta Sans',sans-serif; }
        .sbar { background:#fff; border-bottom:1px solid rgba(0,0,0,.07); padding:12px 0; position:sticky; top:72px; z-index:100; box-shadow:0 2px 12px rgba(0,0,0,.04); }
        .sbar-inner { max-width:1200px; margin:0 auto; padding:0 20px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .spill { display:flex; align-items:center; gap:7px; background:#F7F5F2; border:1.5px solid rgba(0,0,0,.1); border-radius:10px; padding:7px 12px; font-size:13px; font-weight:600; color:#1A1A1A; white-space:nowrap; }
        .spill input,.spill select { background:none; border:none; outline:none; font:inherit; color:inherit; min-width:80px; }
        .spill:focus-within { border-color:#1A9E8A; }

        .main { max-width:1200px; margin:0 auto; padding:24px 20px 60px; display:grid; grid-template-columns:256px 1fr; gap:22px; align-items:start; }
        .sidebar { background:#fff; border:1.5px solid rgba(0,0,0,.07); border-radius:16px; padding:20px; position:sticky; top:140px; }
        .sb-title { font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#bbb; margin-bottom:10px; }
        .sb-divider { height:1px; background:rgba(0,0,0,.07); margin:16px 0; }
        .tb  { flex:1; padding:7px 4px; font-size:11px; font-weight:700; border-radius:8px; border:1.5px solid rgba(0,0,0,.1); background:#fff; cursor:pointer; transition:all .18s; font-family:inherit; color:#888; text-align:center; }
        .tb.on { border-color:#1A9E8A; background:#E8F7F4; color:#157A6B; }
        .pchip { display:flex; align-items:center; gap:5px; padding:6px 10px; border-radius:8px; border:1.5px solid rgba(0,0,0,.1); background:#fff; cursor:pointer; font-size:11px; font-weight:700; color:#888; font-family:inherit; transition:all .18s; }
        .pchip.on { border-color:#1A9E8A; background:#E8F7F4; color:#157A6B; }

        .tc { background:#fff; border:1.5px solid rgba(0,0,0,.07); border-radius:16px; padding:18px 20px; margin-bottom:10px; cursor:pointer; transition:all .22s; animation:fadeUp .45s ease both; position:relative; overflow:visible; }
        .tc::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:transparent; border-radius:3px 0 0 3px; transition:background .22s; }
        .tc:hover { border-color:rgba(26,158,138,.35); transform:translateY(-2px); box-shadow:0 8px 28px rgba(26,158,138,.1); }
        .tc:hover::before,.tc.sel::before { background:linear-gradient(to bottom,#1A9E8A,#22C6AD); }
        .tc.sel { border-color:#1A9E8A; box-shadow:0 0 0 3px rgba(26,158,138,.1); }
        .tc-grid { display:grid; grid-template-columns:56px 1fr 120px 130px; align-items:center; gap:14px; }

        .dep-time { font-size:21px; font-weight:800; letter-spacing:-.03em; color:#1A1A1A; }
        .dep-date { font-size:10px; color:#bbb; margin-top:2px; font-weight:600; }
        .route-viz { display:flex; align-items:center; gap:10px; }
        .city-name { font-size:13px; font-weight:800; color:#1A1A1A; }
        .city-addr { font-size:10px; color:#bbb; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px; }
        .rl { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; min-width:50px; }
        .rt { width:100%; height:2px; background:linear-gradient(90deg,#1A9E8A,rgba(26,158,138,.1)); border-radius:2px; position:relative; }
        .rd { position:absolute; right:-4px; top:-4px; width:10px; height:10px; border-radius:50%; background:#1A9E8A; border:2px solid #fff; box-shadow:0 1px 4px rgba(26,158,138,.4); }
        .rm { font-size:10px; color:#bbb; font-weight:600; }
        .drv-block { display:flex; align-items:center; gap:8px; }
        .drv-av { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; flex-shrink:0; }
        .drv-name { font-size:12px; font-weight:800; color:#1A1A1A; }
        .drv-stars { font-size:9px; color:#F59E0B; }
        .drv-ct { font-size:10px; color:#bbb; }
        .verif { display:inline-flex; align-items:center; gap:2px; background:#E8F7F4; color:#1A9E8A; border-radius:4px; font-size:9px; font-weight:800; padding:2px 5px; margin-top:2px; }
        .prc-block { text-align:right; }
        .prc-val { font-size:13px; font-weight:800; color:#1A9E8A; white-space:nowrap; }
        .prc-lbl { font-size:10px; color:#bbb; }
        .seats-dots { display:flex; gap:3px; justify-content:flex-end; margin-top:4px; }
        .sd { width:7px; height:7px; border-radius:50%; }
        .sd.free { background:#1A9E8A; } .sd.taken { background:#e0ddd8; }
        .prefs-row { display:flex; flex-wrap:wrap; gap:5px; margin-top:12px; padding-top:12px; border-top:1px solid rgba(0,0,0,.06); }
        .ptag { background:#F7F5F2; border:1px solid rgba(0,0,0,.08); border-radius:6px; font-size:10px; font-weight:700; color:#888; padding:3px 8px; }

        .detail { background:#fff; border:1.5px solid #1A9E8A; border-radius:16px; overflow:hidden; animation:slideDown .28s ease both; box-shadow:0 8px 28px rgba(26,158,138,.12); margin-top:-4px; margin-bottom:10px; }
        .sk { background:linear-gradient(90deg,#f0ede8 25%,#e8e4de 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px; }
        .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#1c1917; color:#fff; border-radius:12px; padding:12px 22px; font-size:14px; font-weight:700; z-index:9999; animation:fadeUp .3s ease both; box-shadow:0 8px 24px rgba(0,0,0,.25); white-space:nowrap; font-family:inherit; }

        @media(max-width:900px) {
          .main { grid-template-columns:1fr }
          .sidebar { position:static; display:none }
          .sidebar.open { display:block }
          .filter-btn { display:flex !important }
          .tc-grid { grid-template-columns:50px 1fr auto }
          .drv-block { display:none }
        }
        @media(max-width:600px) {
          .main { padding:12px 12px 48px }
          .sbar-inner { padding:0 12px }
          .tc-grid { grid-template-columns:1fr }
          .prc-block { display:flex; align-items:center; gap:10px; justify-content:space-between }
        }
      `}</style>

      <div className="page-bg">
        {bookMsg && <div className="toast">{bookMsg}</div>}

        {/* ══ Barre de recherche sticky ══ */}
        <div className="sbar">
          <form className="sbar-inner" onSubmit={handleSearch}>

            <div style={{ position:'relative', zIndex:50, flex:'1 1 130px', minWidth:120 }}>
              <CityAutocomplete value={from} onChange={setFrom} placeholder="Départ" icon="📍"
                inputStyle={{ border:'1.5px solid rgba(0,0,0,.1)', borderRadius:10, padding:'7px 32px 7px 32px', fontSize:13, fontWeight:600, background:'#F7F5F2', boxShadow:'none' }} />
            </div>

            <span style={{ color:'#ccc', flexShrink:0 }}>→</span>

            <div style={{ position:'relative', zIndex:49, flex:'1 1 130px', minWidth:120 }}>
              <CityAutocomplete value={to} onChange={setTo} placeholder="Arrivée" icon="🏁"
                inputStyle={{ border:'1.5px solid rgba(0,0,0,.1)', borderRadius:10, padding:'7px 32px 7px 32px', fontSize:13, fontWeight:600, background:'#F7F5F2', boxShadow:'none' }} />
            </div>

            <label className="spill">
              <span>📅</span>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </label>

            <label className="spill" style={{ minWidth:110 }}>
              <span>👤</span>
              <select value={pax} onChange={e=>setPax(e.target.value)}>
                {[1,2,3,4].map(n=><option key={n} value={n}>{n} passager{n>1?'s':''}</option>)}
              </select>
            </label>

            <button type="submit" className="btn-primary" style={{ padding:'9px 18px', fontSize:13, flexShrink:0 }}>
              {loading?'…':'🔍 Chercher'}
            </button>

            <Link to="/" style={{ marginLeft:'auto', flexShrink:0 }}>
              <button type="button" style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'#888', fontFamily:'inherit', padding:'9px 4px' }}>← Accueil</button>
            </Link>
          </form>
        </div>

        <div className="main">

          {/* ══ Sidebar filtres ══ */}
          <aside className={`sidebar${showFilters?' open':''}`}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h2 style={{ fontSize:15, fontWeight:800, color:'#1A1A1A', margin:0 }}>Filtres</h2>
              {filterCount>0 && (
                <button style={{ background:'none', border:'none', color:'#1A9E8A', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
                  onClick={()=>{ setMaxPrice(20000); setTimeSlot('all'); setActivePrefs([]) }}>
                  Réinitialiser ({filterCount})
                </button>
              )}
            </div>

            <div style={{ marginBottom:18 }}>
              <div className="sb-title">Prix maximum</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, color:'#aaa' }}>Jusqu'à</span>
                <span style={{ fontSize:14, fontWeight:800, color:'#1A9E8A' }}>{fmtFCFA(maxPrice)}</span>
              </div>
              <input type="range" min="1000" max="30000" step="500" value={maxPrice}
                onChange={e=>setMaxPrice(+e.target.value)}
                style={{ width:'100%', accentColor:'#1A9E8A', cursor:'pointer' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#ccc', marginTop:3 }}>
                <span>1 000 F</span><span>30 000 F</span>
              </div>
            </div>

            <div className="sb-divider" />

            <div style={{ marginBottom:18 }}>
              <div className="sb-title">Heure de départ</div>
              <div style={{ display:'flex', gap:5 }}>
                {[['all','Tous'],['morning','🌅 Matin'],['afternoon','☀️ Midi'],['evening','🌙 Soir']].map(([id,lbl])=>(
                  <button key={id} className={`tb${timeSlot===id?' on':''}`} onClick={()=>setTimeSlot(id)}>{lbl}</button>
                ))}
              </div>
            </div>

            <div className="sb-divider" />

            <div style={{ marginBottom:18 }}>
              <div className="sb-title">Préférences</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {PREF_FILTERS.map(p=>(
                  <button key={p.id} className={`pchip${activePrefs.includes(p.id)?' on':''}`} onClick={()=>togglePref(p.id)}>
                    {p.icon} {p.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="sb-divider" />
            <label style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
              <input type="checkbox" style={{ accentColor:'#1A9E8A', width:15, height:15 }} />
              <span style={{ fontSize:12, fontWeight:700, color:'#555' }}>Profil vérifié uniquement</span>
            </label>
          </aside>

          {/* ══ Résultats ══ */}
          <div>

            {hasSearched && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                <div>
                  <h1 style={{ fontSize:'clamp(16px,2.5vw,21px)', fontWeight:800, letterSpacing:'-.02em', color:'#1A1A1A', margin:0 }}>
                    {from||t.misc.from} <span style={{ color:'#1A9E8A' }}>→</span> {to||t.misc.to}
                  </h1>
                  <p style={{ fontSize:12, color:'#aaa', marginTop:4, fontWeight:600, margin:'4px 0 0' }}>
                    {loading ? t.search.loading : t.search.results(filtered.length)}
                  </p>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button style={{ display:'none', alignItems:'center', gap:6, background:'#fff', border:'1.5px solid rgba(0,0,0,.1)', borderRadius:9, padding:'8px 14px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                    className="filter-btn" onClick={()=>setShowFilters(v=>!v)}>
                    ⚙️ {t.search.filters}{filterCount>0&&` (${filterCount})`}
                  </button>
                  <select value={sortBy} onChange={e=>handleSortChange(e.target.value)}
                    style={{ background:'#fff', border:'1.5px solid rgba(0,0,0,.1)', borderRadius:9, padding:'8px 26px 8px 12px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', outline:'none', color:'#555', appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none' stroke='%23aaa' stroke-width='2.5' viewBox='0 0 24 24'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' }}>
                    <option value="departure">{t.search.sort_departure}</option>
                    <option value="price">{t.search.sort_price}</option>
                    <option value="rating">{t.search.sort_rating}</option>
                    <option value="seats">Plus de places</option>
                  </select>
                </div>
              </div>
            )}

            {/* Skeleton */}
            {loading && Array.from({length:3}).map((_,i)=>(
              <div key={i} style={{ background:'#fff', border:'1.5px solid rgba(0,0,0,.07)', borderRadius:16, padding:'18px 20px', marginBottom:10, opacity:1-i*.2 }}>
                <div style={{ display:'grid', gridTemplateColumns:'56px 1fr 120px 130px', gap:14 }}>
                  <div><div className="sk" style={{ height:24,width:44,marginBottom:4 }}/><div className="sk" style={{ height:9,width:36 }}/></div>
                  <div><div className="sk" style={{ height:13,width:'60%',marginBottom:8 }}/><div className="sk" style={{ height:9,width:'40%' }}/></div>
                  <div><div className="sk" style={{ height:13,width:'80%',marginBottom:6 }}/><div className="sk" style={{ height:9,width:'60%' }}/></div>
                  <div style={{ textAlign:'right' }}><div className="sk" style={{ height:20,width:90,marginLeft:'auto',marginBottom:4 }}/><div className="sk" style={{ height:9,width:60,marginLeft:'auto' }}/></div>
                </div>
              </div>
            ))}

            {/* Erreur */}
            {error && !loading && (
              <div style={{ background:'#fef2f2', border:'1.5px solid rgba(239,68,68,.2)', borderRadius:14, padding:'16px 20px', color:'#dc2626', fontSize:14, fontWeight:700 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Vide */}
            {!loading && hasSearched && filtered.length===0 && !error && (
              <NoResultBlock from={from} to={to} user={user} />
            )}

            {/* Cartes trajet */}
            {!loading && filtered.map((trip,idx)=>(
              <div key={trip.id} style={{ animationDelay:`${idx*.06}s` }}>
                <div className={`tc${selected===trip.id?' sel':''}`}
                  onClick={()=>setSelected(s=>s===trip.id?null:trip.id)}>
                  <div className="tc-grid">

                    {/* Heure */}
                    <div>
                      <div className="dep-time">{fmt(trip.departureAt)}</div>
                      <div className="dep-date">{fmtDate(trip.departureAt)}</div>
                    </div>

                    {/* Route */}
                    <div className="route-viz">
                      <div>
                        <div className="city-name">{trip.from}</div>
                        <div className="city-addr">{trip.fromAddress||'Gare routière'}</div>
                      </div>
                      <div className="rl">
                        <div className="rt"><div className="rd"/></div>
                        <div className="rm">{trip.duration}</div>
                      </div>
                      <div>
                        <div className="city-name">{trip.to}</div>
                        <div className="city-addr">{trip.toAddress||'Centre-ville'}</div>
                      </div>
                    </div>

                    {/* Conducteur */}
                    <div className="drv-block">
                      <div className="drv-av" style={{
                        background: trip.driverAvatarUrl ? '#E8F7F4' : (trip.driverColor || '#1A9E8A'),
                        overflow:'hidden', padding:0,
                      }}>
                        {trip.driverAvatarUrl
                          ? <img
                              src={trip.driverAvatarUrl.startsWith('http')
                                ? trip.driverAvatarUrl
                                : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${trip.driverAvatarUrl}`}
                              alt={trip.driverFirstName}
                              style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%', display:'block' }}
                              onError={e => {
                                e.target.style.display = 'none'
                                e.target.parentNode.style.background = trip.driverColor || '#1A9E8A'
                                e.target.parentNode.textContent = trip.driverAvatar || '?'
                              }}
                            />
                          : <span style={{ color:'#fff', fontWeight:800, fontSize:14 }}>{trip.driverAvatar || '?'}</span>
                        }
                      </div>
                      <div>
                        <div className="drv-name">{trip.driverFirstName}</div>
                        <div className="drv-stars">{stars(trip.driverRating)}</div>
                        <div className="drv-ct">{trip.driverReviews||0} {t.misc.reviews}</div>
                        {trip.driverVerified && <div className="verif">✓ {t.misc.verified}</div>}
                      </div>
                    </div>

                    {/* Prix */}
                    <div className="prc-block">
                      <div className="prc-val">{fmtFCFA(trip.price)}</div>
                      <div className="prc-lbl">/ place</div>
                      <div className="seats-dots">
                        {Array.from({length:Math.min(trip.totalSeats||4,6)}).map((_,k)=>(
                          <div key={k} className={`sd ${k<((trip.totalSeats||4)-(trip.availableSeats||0))?'taken':'free'}`}/>
                        ))}
                      </div>
                      <div style={{ fontSize:10,color:'#bbb',marginTop:2,fontWeight:600 }}>
                        {trip.availableSeats||0} libre{(trip.availableSeats||0)>1?'s':''}
                      </div>
                    </div>
                  </div>

                  {trip.prefs?.length>0 && (
                    <div className="prefs-row">
                      {trip.prefs.map(p=><span key={p} className="ptag">{p}</span>)}
                      <span style={{ marginLeft:'auto', fontSize:11, color:'#1A9E8A', fontWeight:800 }}>
                        {selected===trip.id?'↑ Masquer':'Voir détails →'}
                      </span>
                    </div>
                  )}
                </div>

                {/* ══ Détail avec carte ══ */}
                {selected===trip.id && (
                  <div className="detail">
                    <div style={{ background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ color:'rgba(255,255,255,.7)', fontSize:10, fontWeight:800, marginBottom:3, letterSpacing:'.06em' }}>TRAJET SÉLECTIONNÉ · 🇨🇲 CAMEROUN</div>
                        <div style={{ color:'#fff', fontSize:18, fontWeight:800 }}>{trip.from} → {trip.to}</div>
                        <div style={{ color:'rgba(255,255,255,.8)', fontSize:12, marginTop:2 }}>
                          {fmt(trip.departureAt)} · {trip.duration} · {fmtFCFA(trip.price)}/place
                        </div>
                      </div>
                      <div style={{ fontSize:32, filter:'drop-shadow(0 2px 6px rgba(0,0,0,.2))' }}>🗺️</div>
                    </div>

                    <div style={{ padding:'20px 22px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>

                        {/* Conducteur */}
                        <div style={{ background:'#F7F5F2', borderRadius:12, padding:14 }}>
                          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#bbb', marginBottom:10 }}>{t.search.driver}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div className="drv-av" style={{ width:44, height:44, fontSize:17, flexShrink:0,
                              background: trip.driverAvatarUrl ? '#E8F7F4' : (trip.driverColor || '#1A9E8A'),
                              overflow:'hidden', padding:0 }}>
                              {trip.driverAvatarUrl
                                ? <img
                                    src={trip.driverAvatarUrl.startsWith('http')
                                      ? trip.driverAvatarUrl
                                      : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${trip.driverAvatarUrl}`}
                                    alt={trip.driverName}
                                    style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%', display:'block' }}
                                    onError={e => {
                                      e.target.style.display = 'none'
                                      e.target.parentNode.style.background = trip.driverColor || '#1A9E8A'
                                      e.target.parentNode.textContent = trip.driverAvatar || '?'
                                    }}
                                  />
                                : <span style={{ color:'#fff', fontWeight:800 }}>{trip.driverAvatar || '?'}</span>
                              }
                            </div>
                            <div>
                              <div style={{ fontWeight:800, fontSize:15, color:'#1A1A1A' }}>{trip.driverName}</div>
                              <div style={{ color:'#F59E0B', fontSize:11 }}>{stars(trip.driverRating)}</div>
                              <div style={{ color:'#aaa', fontSize:11 }}>{trip.driverRating||0}/5 · {trip.driverReviews||0} {t.misc.reviews}</div>
                              {trip.driverVerified && <div style={{ color:'#1A9E8A', fontSize:11, fontWeight:700 }}>✓ {t.misc.verified}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Infos */}
                        <div>
                          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#bbb', marginBottom:10 }}>{t.search.vehicle}</div>
                          {[
                            ['📍', t.search.departure, trip.fromAddress||trip.from],
                            ['🏁', t.search.arrival,   trip.toAddress||trip.to],
                            ['⏱',  t.search.duration,  trip.duration],
                            ['💺', t.misc.seats, `${trip.availableSeats||0} ${lang==='fr'?'libre':'left'} / ${trip.totalSeats||4}`]
                          ].map(([icon,key,val])=>(
                            <div key={key} style={{ display:'flex', gap:8, marginBottom:6 }}>
                              <span style={{ fontSize:12, width:16, flexShrink:0 }}>{icon}</span>
                              <div>
                                <div style={{ fontSize:9, color:'#bbb', fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em' }}>{key}</div>
                                <div style={{ fontSize:12, fontWeight:700, color:'#1A1A1A' }}>{val}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ══ CARTE ══ */}
                      <div style={{ marginBottom:18 }}>
                        <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#bbb', marginBottom:10 }}>
                          📍 Itinéraire sur la carte
                        </div>
                        <TripMap from={trip.from} to={trip.to} height={260} />
                      </div>

                      {/* Prefs */}
                      {trip.prefs?.length>0 && (
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#bbb', marginBottom:8 }}>Préférences</div>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {trip.prefs.map(p=>(
                              <span key={p} style={{ background:'#E8F7F4', color:'#157A6B', border:'1px solid rgba(26,158,138,.2)', borderRadius:7, fontSize:11, fontWeight:700, padding:'4px 10px' }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {trip.description && (
                        <div style={{ background:'#F7F5F2', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:13, color:'#888', lineHeight:1.65, fontStyle:'italic' }}>
                          "{trip.description}"
                        </div>
                      )}

                      {/* CTA */}
                      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                        <div>
                          <div style={{ fontSize:20, fontWeight:800, color:'#1A9E8A' }}>
                            {fmtFCFA(trip.price)}
                            <span style={{ fontSize:12, fontWeight:600, color:'#aaa', marginLeft:6 }}>/ personne</span>
                          </div>
                          <div style={{ fontSize:11, color:'#bbb', fontWeight:600 }}>Paiement à bord · Mobile Money · Orange Money</div>
                        </div>
                        <div style={{ flex:1 }}/>
                        {booking[trip.id]==='done' ? (
                          <div style={{ background:'#E8F7F4', color:'#157A6B', borderRadius:10, padding:'12px 20px', fontSize:14, fontWeight:800 }}>✅ Réservé !</div>
                        ) : (
                          <>
                            <button style={{ background:'none', border:'1.5px solid rgba(26,158,138,.4)', color:'#1A9E8A', borderRadius:10, padding:'11px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                              onClick={e => {
                                e.stopPropagation()
                                if (!user) { navigate('/login'); return }
                                setContactTrip(trip)
                              }}>
                              💬 Contacter
                            </button>
                            <button className="btn-primary" style={{ padding:'11px 22px', fontSize:14 }}
                              disabled={booking[trip.id]==='loading'}
                              onClick={e=>{ e.stopPropagation(); handleBook(trip) }}>
                              {booking[trip.id]==='loading'?'…':'Réserver →'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Modal Contacter ══ */}
      {contactTrip && (
        <ContactModal
          trip={contactTrip}
          onClose={() => setContactTrip(null)}
        />
      )}
    </>
  )
}
