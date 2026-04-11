import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/api'
import CityAutocomplete from '../components/CityAutocomplete'
import { POPULAR_ROUTES_CM, fmtFCFA } from '../data/cameroun'

const FEATURED = POPULAR_ROUTES_CM

const REVIEWS_BG = [
  'linear-gradient(135deg,#1A9E8A,#22C6AD)',
  'linear-gradient(135deg,#FF6B35,#FF8C5A)',
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
]

export default function Home() {
  const { t, lang } = useLang()
  const { fetchMe, setUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [from, setFrom]       = useState('')
  const [to,   setTo]         = useState('')
  const [date, setDate]       = useState('')
  const [pax,  setPax]        = useState(1)
  const [mode, setMode]       = useState('car')

  // ── Gérer le retour OAuth cross-domain (?oauth=success&sid=xxx) ──
  useEffect(() => {
    const oauthStatus = params.get('oauth')
    const sid         = params.get('sid')
    if (oauthStatus === 'success' && sid) {
      fetch(`${API_URL}/api/auth/oauth-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setUser(data.user)
            window.history.replaceState({}, '', '/')
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to)   p.set('to',   to)
    if (date) p.set('date', date)
    p.set('passengers', pax)
    navigate(`/search?${p}`)
  }

  const MODES = [
    { id: 'car',    icon: '🚗', label: 'Covoiturage' },
    { id: 'bus',    icon: '🚌', label: 'Bus',         badge: true },
    { id: 'camion', icon: '🚛', label: 'Camion',      badge: true },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700&display=swap');

        /* ── Animations ──────────────────────── */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes floatY  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

        .h-page  { font-family:'Plus Jakarta Sans',sans-serif; background:#fff; }
        .h-inner { max-width:1200px; margin:0 auto; padding:0 28px; }

        /* ── Hero ── */
        /* ══ HERO — style BlaBlaCar ══ */
        .h-hero {
          background: #fff;
          padding: 0; overflow: hidden;
          border-bottom: 1px solid rgba(0,0,0,.07);
        }
        .h-hero-top {
          max-width: 1200px; margin: 0 auto; padding: 56px 28px 0;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 48px; align-items: center; min-height: 360px;
        }
        .h-hero-left { padding-bottom: 40px; }
        .h-hero-title {
          font-size: clamp(32px, 4.5vw, 56px); font-weight: 900;
          color: #0F172A; line-height: 1.1; letter-spacing: -0.03em;
          margin: 0 0 20px; animation: fadeUp .5s ease both;
        }
        .h-hero-title span { color: #1A9E8A; }
        .h-hero-sub {
          font-size: 16px; color: #64748B; line-height: 1.65;
          margin: 0 0 28px; max-width: 440px; animation: fadeUp .5s .1s ease both;
        }
        .h-hero-right {
          height: 400px; border-radius: 20px 20px 0 0; overflow: hidden;
          background: linear-gradient(145deg, #c8ede8, #8dd5cc);
          position: relative; animation: fadeIn .7s .1s ease both;
        }
        .h-hero-photo {
          width: 100%; height: 100%; object-fit: cover;
        }
        /* Photo overlay avec une illustration SVG camerounaise */
        .h-hero-badge {
          position: absolute; bottom: 20px; left: 20px;
          background: rgba(255,255,255,.95); border-radius: 14px;
          padding: 12px 16px; box-shadow: 0 8px 24px rgba(0,0,0,.12);
          display: flex; align-items: center; gap: 12px;
          animation: fadeUp .6s .3s ease both;
        }

        /* ── Searchbar — pleine largeur sous les modes ── */
        .h-search-section {
          background: #fff; padding: 20px 0 32px;
        }
        .h-search-inner {
          max-width: 1200px; margin: 0 auto; padding: 0 28px;
        }
        .h-searchbar {
          background: #fff; border: 2px solid #0F172A;
          border-radius: 50px; overflow: visible;
          display: flex; align-items: stretch;
          box-shadow: 0 2px 12px rgba(0,0,0,.08);
          animation: fadeUp .5s .2s ease both;
          transition: box-shadow .2s;
        }
        .h-searchbar:focus-within {
          box-shadow: 0 4px 24px rgba(26,158,138,.2);
          border-color: #1A9E8A;
        }

        .h-sb-field {
          flex:1; display:flex; align-items:center; gap:10px;
          padding:10px 22px; cursor:text; min-width:0;
          border-right:1px solid rgba(0,0,0,.1);
          transition:background .15s;
        }
        .h-sb-field:first-child { border-radius: 50px 0 0 50px; }
        .h-sb-field:hover { background: rgba(0,0,0,.02); }
        .h-sb-icon { font-size:16px; flex-shrink:0; color:#1A9E8A; }
        .h-sb-inner { display:flex; flex-direction:column; min-width:0; }
        .h-sb-label { font-size:11px; font-weight:700; color:#999; letter-spacing:.04em; text-transform:uppercase; line-height:1; }
        .h-sb-input {
          background:none; border:none; outline:none;
          font-family:'Plus Jakarta Sans',sans-serif;
          font-size:15px; font-weight:700; color:#0F172A;
          padding:0; width:100%; margin-top:2px;
        }
        .h-sb-input::placeholder { color:#CBD5E1; font-weight:500; }
        .h-sb-select {
          background:none; border:none; outline:none; cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif;
          font-size:15px; font-weight:700; color:#0F172A;
          padding:0; margin-top:2px; appearance:none; width:100%;
        }
        .h-sb-btn {
          background:#1A9E8A; color:#fff; border:none; cursor:pointer;
          padding:0 32px; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:15px; font-weight:800; letter-spacing:-.01em;
          border-radius:0 50px 50px 0;
          transition:background .18s; flex-shrink:0; white-space:nowrap;
          min-height:56px;
        }
        .h-sb-btn:hover { background:#157A6B; }

        /* ── Stats bar ── */
        .h-stats-bar {
          display:grid; grid-template-columns:repeat(4,1fr);
          background:#F8FAFC; border-top:1px solid rgba(0,0,0,.07);
        }
        .h-stat-cell {
          padding:20px 24px; display:flex; align-items:center; gap:12px;
          border-right:1px solid rgba(0,0,0,0.07); transition:background .18s;
        }
        .h-stat-cell:last-child { border-right:none; }
        .h-stat-cell:hover { background:#f0fdf8; }

        /* ── Popular routes ── */
        .h-routes-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .h-route-card {
          display:flex; align-items:center; gap:14px;
          padding:18px 20px; border-radius:14px;
          border:1.5px solid rgba(0,0,0,0.08); background:#fff;
          cursor:pointer; text-decoration:none; transition:all .22s;
        }
        .h-route-card:hover { border-color:#1A9E8A; transform:translateY(-3px); box-shadow:0 10px 28px rgba(26,158,138,0.12); }
        .h-route-emoji {
          width:48px; height:48px; border-radius:14px;
          background:#f5f5f5; display:flex; align-items:center;
          justify-content:center; font-size:24px; flex-shrink:0;
        }

        /* ── Steps ── */
        .h-steps-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .h-step-card {
          background:#fff; border:1.5px solid rgba(0,0,0,0.07);
          border-radius:18px; padding:32px 26px; transition:all .25s;
        }
        .h-step-card:hover { transform:translateY(-6px); box-shadow:0 16px 40px rgba(0,0,0,0.08); }

        /* ── Reviews ── */
        .h-reviews-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
        .h-review-card {
          background:#fff; border:1.5px solid rgba(0,0,0,0.07);
          border-radius:16px; padding:24px; transition:all .25s;
        }
        .h-review-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,0.09); }

        /* ── Stats bar — bande blanche sous le hero teal ── */
        .h-stats-bar {
          display:grid; grid-template-columns:repeat(4,1fr);
          background:#fff;
          border-radius:0 0 20px 20px;
          box-shadow:0 8px 32px rgba(0,0,0,.08);
          margin:0 0 0 0;
        }
        .h-stat-cell {
          padding:20px 24px; display:flex; align-items:center; gap:12px;
          border-right:1px solid rgba(0,0,0,0.07);
          transition:background .18s;
        }
        .h-stat-cell:last-child { border-right:none; }
        .h-stat-cell:hover { background:#f0fdf8; }

        /* ── CTA banner ── */
        .h-cta {
          border-radius:24px; overflow:hidden; position:relative;
          background:linear-gradient(135deg,#0B6B5E 0%,#1A9E8A 55%,#0d7a6e 100%);
          box-shadow:0 20px 60px rgba(26,158,138,0.3);
        }

        /* ── Section labels ── */
        .h-sec-label {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(26,158,138,0.1); color:#1A9E8A;
          font-size:12px; font-weight:800; letter-spacing:.08em;
          text-transform:uppercase; padding:5px 12px; border-radius:20px;
          margin-bottom:14px;
        }

        @media(max-width:1024px) {
          .h-hero-top { grid-template-columns:1fr; gap:0; }
          .h-hero-right { height:300px; border-radius:0; }
          .h-routes-grid { grid-template-columns:repeat(2,1fr); }
          .h-reviews-grid { grid-template-columns:repeat(2,1fr); }
          .h-stats-bar { grid-template-columns:repeat(2,1fr); }
          .h-stat-cell:nth-child(2) { border-right:none; }
        }
        @media(max-width:768px) {
          .h-inner { padding:0 18px; }
          .h-hero-top { padding:36px 18px 0; }
          .h-hero-title { font-size:clamp(26px,7vw,36px); }
          .h-hero-left { padding-bottom:24px; }
          .h-search-inner { padding:0 18px; }
          .h-modes-inner { padding:0 18px; }
          .h-steps-grid { grid-template-columns:1fr; }
          .h-routes-grid { grid-template-columns:1fr 1fr; }
          .h-reviews-grid { grid-template-columns:1fr; }
          .h-stats-bar { grid-template-columns:repeat(2,1fr); }
          .h-searchbar { flex-wrap:wrap; border-radius:16px; border-width:1.5px; }
          .h-sb-field { flex:1 1 140px; border-right:none; border-bottom:1px solid rgba(0,0,0,0.08); }
          .h-sb-field:first-child { border-radius:16px 16px 0 0; }
          .h-sb-btn { width:100%; border-radius:0 0 14px 14px; padding:14px; }
          .mode-tab { padding:14px 16px; font-size:13px; }
        }
        @media(max-width:480px) {
          .h-routes-grid { grid-template-columns:1fr; }
          .h-stats-bar { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      <div className="h-page">

        {/* ═══════════════════════════════════════════ */}
        {/*  HERO — style BlaBlaCar                    */}
        {/* ═══════════════════════════════════════════ */}
        <section className="h-hero">

          {/* ── Partie haute : titre gauche + image droite ── */}
          <div className="h-hero-top">
            <div className="h-hero-left">
              {/* Badge */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#E8F7F4', borderRadius:30, padding:'6px 14px', marginBottom:20, animation:'fadeUp .4s ease both' }}>
                <span>🎁</span>
                <span style={{ fontSize:12, fontWeight:800, color:'#1A9E8A' }}>10 premiers trajets gratuits</span>
              </div>

              {/* Titre */}
              <h1 className="h-hero-title">
                Covoiturage, Bus, Camion :<br/>
                <span>Covoitgo</span> vous emmène<br/>
                où vous voulez.
              </h1>

              <p className="h-hero-sub">
                Voyagez malin entre les villes du Cameroun. Simple, sûr et abordable.
              </p>

              {/* Stats rapides */}
              <div style={{ display:'flex', gap:28, animation:'fadeUp .5s .15s ease both' }}>
                {[
                  { n:'37+', label:'Villes', color:'#1A9E8A' },
                  { n:'10%', label:'Commission', color:'#FF6B35' },
                  { n:'100%', label:'Sécurisé', color:'#7C3AED' },
                ].map(s => (
                  <div key={s.n}>
                    <div style={{ fontSize:24, fontWeight:900, color:s.color, letterSpacing:'-.03em', lineHeight:1 }}>{s.n}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', fontWeight:600, marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Côté droit : illustration ── */}
            <div className="h-hero-right">
              {/* Illustration SVG — route camerounaise */}
              <svg viewBox="0 0 560 400" style={{ width:'100%', height:'100%' }} preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#87CEEB"/>
                    <stop offset="100%" stopColor="#C8EDF0"/>
                  </linearGradient>
                  <linearGradient id="hgrass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A8C5F"/>
                    <stop offset="100%" stopColor="#4A7A4E"/>
                  </linearGradient>
                </defs>
                {/* Ciel */}
                <rect width="560" height="400" fill="url(#hsky)"/>
                {/* Soleil */}
                <circle cx="460" cy="70" r="45" fill="#FDE68A" opacity=".6"/>
                <circle cx="460" cy="70" r="30" fill="#FCD34D" opacity=".8"/>
                {/* Nuages */}
                <ellipse cx="100" cy="80" rx="55" ry="20" fill="#fff" opacity=".8"/>
                <ellipse cx="75"  cy="82" rx="35" ry="16" fill="#fff" opacity=".9"/>
                <ellipse cx="320" cy="55" rx="45" ry="16" fill="#fff" opacity=".7"/>
                {/* Montagnes */}
                <polygon points="0,250 110,100 220,250" fill="#4A7A5C" opacity=".85"/>
                <polygon points="90,250 200,115 310,250" fill="#3D6B4E" opacity=".9"/>
                <polygon points="260,250 380,90 500,250" fill="#2D5A3E" opacity=".85"/>
                <polygon points="400,250 520,130 640,250" fill="#3D6B4E" opacity=".8"/>
                {/* Neige */}
                <polygon points="110,100 125,128 95,128" fill="#fff" opacity=".9"/>
                <polygon points="200,115 215,142 185,142" fill="#fff" opacity=".85"/>
                <polygon points="380,90 398,122 362,122" fill="#fff" opacity=".9"/>
                {/* Sol */}
                <rect x="0" y="290" width="560" height="110" fill="url(#hgrass)"/>
                {/* Route */}
                <path d="M0,380 L170,310 L390,305 L560,360 L560,400 L0,400 Z" fill="#374151"/>
                {/* Lignes route */}
                <line x1="170" y1="310" x2="390" y2="305" stroke="#FDE68A" strokeWidth="3" strokeDasharray="20 12" opacity=".7"/>
                {/* Arbre gauche */}
                <rect x="46" y="248" width="8" height="42" fill="#92400E"/>
                <ellipse cx="50" cy="238" rx="22" ry="30" fill="#2D6A4F"/>
                {/* Arbre droite */}
                <rect x="495" y="252" width="8" height="38" fill="#92400E"/>
                <ellipse cx="499" cy="242" rx="20" ry="28" fill="#2D6A4F"/>
                {/* Voiture teal principale */}
                <g transform="translate(180,295)">
                  <rect x="0" y="18" width="130" height="46" rx="8" fill="#1A9E8A"/>
                  <path d="M22,18 Q26,0 50,0 L88,0 Q110,0 114,18 Z" fill="#157A6B"/>
                  <path d="M27,16 Q30,3 48,3 L84,3 Q104,3 108,16 Z" fill="#BAE6FD" opacity=".75"/>
                  <rect x="30" y="4" width="26" height="12" rx="3" fill="#BAE6FD" opacity=".7"/>
                  <rect x="72" y="4" width="26" height="12" rx="3" fill="#BAE6FD" opacity=".7"/>
                  <circle cx="26"  cy="64" r="14" fill="#1F2937"/>
                  <circle cx="26"  cy="64" r="7"  fill="#374151"/>
                  <circle cx="104" cy="64" r="14" fill="#1F2937"/>
                  <circle cx="104" cy="64" r="7"  fill="#374151"/>
                  <rect x="118" y="26" width="14" height="8" rx="3" fill="#FDE68A" opacity=".9"/>
                  <circle cx="55" cy="9" r="5" fill="rgba(255,255,255,.5)"/>
                  <circle cx="80" cy="9" r="5" fill="rgba(255,255,255,.4)"/>
                </g>
                {/* Camion orange au loin */}
                <g transform="translate(50,315)" opacity=".75">
                  <rect x="0" y="0" width="80" height="35" rx="4" fill="#FF6B35"/>
                  <rect x="55" y="-14" width="28" height="16" rx="3" fill="#E85520"/>
                  <rect x="57" y="-12" width="24" height="12" rx="2" fill="#BAE6FD" opacity=".6"/>
                  <circle cx="15" cy="35" r="9" fill="#1F2937"/>
                  <circle cx="65" cy="35" r="9" fill="#1F2937"/>
                </g>
                {/* Bulle prix */}
                <g transform="translate(340,200)">
                  <rect x="0" y="0" width="140" height="58" rx="14" fill="#fff" opacity=".96" filter="drop-shadow(0 4px 12px rgba(0,0,0,.15))"/>
                  <polygon points="35,58 52,74 68,58" fill="#fff" opacity=".96"/>
                  <text x="14" y="24" fontSize="10" fontWeight="700" fill="#1A9E8A">Douala → Yaoundé</text>
                  <text x="14" y="43" fontSize="19" fontWeight="900" fill="#0F172A">5 000 F</text>
                  <text x="90" y="43" fontSize="10" fill="#94A3B8">/ pers.</text>
                  <circle cx="124" cy="16" r="11" fill="#1A9E8A"/>
                  <text x="124" y="20" fontSize="12" textAnchor="middle" fill="#fff">★</text>
                </g>
              </svg>
            </div>
          </div>

          {/* ── Barre de recherche pleine largeur ── */}
          <div className="h-search-section">
            <div className="h-search-inner">
              <form onSubmit={handleSearch}>
                <div className="h-searchbar">

                  <div className="h-sb-field" style={{ overflow:'visible', zIndex:20, padding:0, border:'none', flex:2 }}>
                    <div className="h-sb-inner" style={{ overflow:'visible', flex:1, padding:'0 24px' }}>
                      <span className="h-sb-label">{t.hero.dep}</span>
                      <CityAutocomplete value={from} onChange={setFrom} placeholder="Ville de départ" icon="📍"
                        inputStyle={{ border:'none', boxShadow:'none', padding:'2px 28px 2px 22px', fontSize:15, fontWeight:700, background:'transparent', borderRadius:0, width:'100%' }}/>
                    </div>
                  </div>

                  <div className="h-sb-field" style={{ overflow:'visible', zIndex:19, padding:0, border:'none', borderLeft:'1px solid rgba(0,0,0,.1)', flex:2 }}>
                    <div className="h-sb-inner" style={{ overflow:'visible', flex:1, padding:'0 24px' }}>
                      <span className="h-sb-label">{t.hero.dest}</span>
                      <CityAutocomplete value={to} onChange={setTo} placeholder="Ville d'arrivée" icon="🏁"
                        inputStyle={{ border:'none', boxShadow:'none', padding:'2px 28px 2px 22px', fontSize:15, fontWeight:700, background:'transparent', borderRadius:0, width:'100%' }}/>
                    </div>
                  </div>

                  <label className="h-sb-field" style={{ flex:1.1, borderLeft:'1px solid rgba(0,0,0,.1)' }}>
                    <span className="h-sb-icon">📅</span>
                    <div className="h-sb-inner">
                      <span className="h-sb-label">{t.hero.today}</span>
                      <input type="date" className="h-sb-input h-sb-select" value={date} onChange={e => setDate(e.target.value)}/>
                    </div>
                  </label>

                  <label className="h-sb-field" style={{ flex:0.9, borderLeft:'1px solid rgba(0,0,0,.1)' }}>
                    <span className="h-sb-icon">👤</span>
                    <div className="h-sb-inner">
                      <span className="h-sb-label">{t.hero.passengers}</span>
                      <select className="h-sb-select" value={pax} onChange={e => setPax(+e.target.value)}>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{t.hero.nPassengers(n)}</option>)}
                      </select>
                    </div>
                  </label>

                  <button type="submit" className="h-sb-btn">🔍 Rechercher</button>
                </div>
              </form>
            </div>
          </div>

          {/* Stats bar */}
          <div className="h-inner">
            <div className="h-stats-bar">
              {t.stats.map((s, i) => {
                const icons  = ['👥','🚗','⭐','💰']
                const colors = ['#1A9E8A','#FF6B35','#F59E0B','#7C3AED']
                const bgs    = ['#E8F7F4','#FFF0E8','#FFFBEB','#F3EEFF']
                return (
                  <div key={i} className="h-stat-cell">
                    <div style={{ width:42, height:42, borderRadius:12, background:bgs[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{icons[i]}</div>
                    <div>
                      <div style={{ fontSize:22, fontWeight:900, color:colors[i], letterSpacing:'-0.04em', lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:12, color:'#888', fontWeight:500, marginTop:2 }}>{s.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════ */}
        {/*  POPULAR ROUTES                             */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding:'72px 0', background:'#fafafa' }}>
          <div className="h-inner">
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:12 }}>
              <div>
                <div className="h-sec-label">{t.popular.label}</div>
                <h2 style={{ fontSize:'clamp(22px,3vw,36px)', fontWeight:900, color:'#1A1A1A', letterSpacing:'-0.04em', margin:0 }}>
                  {t.popular.title}
                </h2>
              </div>
              <Link to="/search" style={{ fontSize:14, fontWeight:700, color:'#1A9E8A', textDecoration:'none' }}>
                {t.popular.seeAll} →
              </Link>
            </div>

            <div className="h-routes-grid">
              {FEATURED.map((r, i) => (
                <Link key={i} to={`/search?from=${r.from}&to=${r.to}`} className="h-route-card">
                  <div className="h-route-emoji">{r.emoji}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15, color:'#1A1A1A' }}>{r.from} → {r.to}</div>
                    <div style={{ fontSize:12, color:'#aaa', marginTop:3 }}>{r.trips} {t.popular.perWeek}</div>
                    <div style={{ fontSize:13, color:'#1A9E8A', fontWeight:800, marginTop:3 }}>{t.popular.from} {fmtFCFA(r.price)}</div>
                  </div>
                  <div style={{ marginLeft:'auto', color:'#ddd', fontSize:18 }}>›</div>
                </Link>
              ))}
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════ */}
        {/*  HOW IT WORKS                               */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding:'72px 0', background:'#fff' }}>
          <div className="h-inner">
            <div style={{ textAlign:'center', marginBottom:52 }}>
              <div className="h-sec-label">{t.how.label}</div>
              <h2 style={{ fontSize:'clamp(24px,3.5vw,42px)', fontWeight:900, color:'#1A1A1A', letterSpacing:'-0.04em', margin:0 }}>
                {t.how.title}
              </h2>
            </div>
            <div className="h-steps-grid">
              {t.how.steps.map((step, i) => {
                const colors = ['#1A9E8A','#7C3AED','#FF6B35']
                const bgs    = ['#E8F7F4','#F3EEFF','#FFF0E8']
                return (
                  <div key={i} className="h-step-card">
                    <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                      <div style={{ width:56, height:56, borderRadius:16, background:bgs[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
                        {step.icon}
                      </div>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:colors[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0 }}>
                        {i + 1}
                      </div>
                    </div>
                    <h3 style={{ fontWeight:800, fontSize:19, color:'#1A1A1A', margin:'0 0 10px', letterSpacing:'-0.02em' }}>{step.title}</h3>
                    <p style={{ color:'#777', fontSize:14.5, lineHeight:1.75, margin:0 }}>{step.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════ */}
        {/*  REVIEWS                                    */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding:'72px 0', background:'#fafafa' }}>
          <div className="h-inner">
            <div style={{ textAlign:'center', marginBottom:48 }}>
              <div className="h-sec-label">{t.reviews.label}</div>
              <h2 style={{ fontSize:'clamp(22px,3.5vw,40px)', fontWeight:900, color:'#1A1A1A', letterSpacing:'-0.04em', margin:0 }}>
                {t.reviews.title}
              </h2>
            </div>
            <div className="h-reviews-grid">
              {t.reviews.list.map((r, i) => (
                <div key={i} className="h-review-card">
                  <div style={{ fontSize:18, color:'#F59E0B', marginBottom:14, letterSpacing:2 }}>★★★★★</div>
                  <p style={{ fontSize:14.5, color:'#555', lineHeight:1.8, marginBottom:20, fontStyle:'italic' }}>"{r.text}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:REVIEWS_BG[i], display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, color:'#fff', flexShrink:0 }}>
                      {r.avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:'#1A1A1A' }}>{r.name}</div>
                      <div style={{ fontSize:12, color:'#aaa' }}>{r.trip}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ═══════════════════════════════════════════ */}
        {/*  CTA BANNER                                 */}
        {/* ═══════════════════════════════════════════ */}
        <section style={{ padding:'60px 0 80px', background:'#fff' }}>
          <div className="h-inner">
            <div className="h-cta">
              {/* Decorative circles */}
              <div style={{ position:'absolute', top:'-20%', right:'-3%', width:360, height:360, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:'-25%', right:'20%', width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

              <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr auto', gap:40, alignItems:'center', padding:'52px 52px', flexWrap:'wrap' }}>
                <div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:20 }}>
                    {t.cta.badge}
                  </div>
                  <h2 style={{ fontSize:'clamp(24px,3.5vw,44px)', fontWeight:900, letterSpacing:'-0.04em', marginBottom:12, color:'#fff', lineHeight:1.15 }}>
                    {t.cta.title1}<br />
                    <span style={{ color:'#A7F3D0' }}>{t.cta.title2}</span>
                  </h2>
                  <p style={{ color:'rgba(255,255,255,0.72)', fontSize:15.5, lineHeight:1.8, marginBottom:30, maxWidth:480, fontWeight:400 }}>
                    {t.cta.desc}
                  </p>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <Link to="/publish">
                      <button style={{ background:'#fff', color:'#1A9E8A', border:'none', borderRadius:12, padding:'14px 28px', fontSize:15, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(0,0,0,0.2)', transition:'all .2s', fontFamily:'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)'; }}>
                        {t.cta.btn}
                      </button>
                    </Link>
                    <Link to="/search">
                      <button style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)', borderRadius:12, padding:'14px 28px', fontSize:15, fontWeight:700, cursor:'pointer', transition:'background .2s', fontFamily:'inherit' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.22)'}
                        onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
                        {t.cta.learn}
                      </button>
                    </Link>
                  </div>
                </div>
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:90, animation:'floatY 4s ease-in-out infinite', filter:'drop-shadow(0 16px 32px rgba(0,0,0,0.25))' }}>🚗</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:8, fontWeight:500 }}>{t.cta.next}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
