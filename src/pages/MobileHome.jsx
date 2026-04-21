import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { POPULAR_ROUTES } from '../data/cameroun'
import CityPicker from '../components/CityPicker'

export default function MobileHome() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')
  const [date, setDate] = useState('')
  const [pax,  setPax]  = useState(1)

  const today = new Date().toISOString().split('T')[0]

  const handleSearch = () => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to)   p.set('to',   to)
    if (date) p.set('date', date)
    p.set('passengers', pax)
    navigate(`/search?${p}`)
  }

  const firstName = user?.firstName || ''

  return (
    <div style={{
      minHeight:  '100vh',
      background: '#F7F8FA',
      fontFamily: "-apple-system,'SF Pro Display',sans-serif",
      paddingBottom: 80,
    }}>

      {/* ── En-tête ───────────────────────────────────────────── */}
      <div style={{ background:'#fff', padding:'56px 20px 24px', borderBottom:'1px solid rgba(0,0,0,.05)' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            {user && (
              <p style={{ fontSize:13, color:'#6B7280', margin:'0 0 2px', fontWeight:500 }}>
                Bonjour, {firstName} ! 👋
              </p>
            )}
            <h1 style={{ fontSize:24, fontWeight:900, color:'#111827', margin:0, lineHeight:1.25, letterSpacing:'-.03em' }}>
              {user ? 'Où allez-vous ?' : 'Voyagez partout\nau Cameroun 🇨🇲'}
            </h1>
          </div>
          <div style={{ width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
            🚗
          </div>
        </div>

        {/* ── Carte de recherche ──────────────────────────────── */}
        <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #E5E7EB', overflow:'visible', boxShadow:'0 2px 16px rgba(0,0,0,.06)' }}>

          {/* Départ */}
          <div style={{ display:'flex', alignItems:'center', padding:'14px 16px', gap:12, borderBottom:'1px solid #F3F4F6', position:'relative', zIndex:10 }}>
            <div style={{ width:12,height:12,borderRadius:'50%',border:'2.5px solid #1A9E8A',flexShrink:0 }}/>
            <CityPicker
              value={from}
              onChange={setFrom}
              placeholder="Départ"
              exclude={to}
              style={{ flex:1 }}
            />
          </div>

          {/* Swap button */}
          <div style={{ position:'relative', height:0 }}>
            <button
              onClick={() => { setFrom(to); setTo(from) }}
              style={{ position:'absolute', right:16, top:-16, width:32, height:32, borderRadius:'50%', background:'#fff', border:'1.5px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, zIndex:5, boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              ⇅
            </button>
          </div>

          {/* Destination */}
          <div style={{ display:'flex', alignItems:'center', padding:'14px 16px', gap:12, borderBottom:'1px solid #F3F4F6', position:'relative', zIndex:9 }}>
            <div style={{ width:12,height:12,borderRadius:3,border:'2.5px solid #6B7280',flexShrink:0 }}/>
            <CityPicker
              value={to}
              onChange={setTo}
              placeholder="Destination"
              exclude={from}
              style={{ flex:1 }}
            />
          </div>

          {/* Date + Passagers */}
          <div style={{ display:'flex', borderBottom:'1px solid #F3F4F6', overflow:'hidden' }}>
            <label style={{ flex:'0 0 55%', display:'block', maxWidth:'55%' }}>
              <div style={{ display:'flex', alignItems:'center', padding:'13px 12px', gap:8, borderRight:'1px solid #F3F4F6' }}>
                <span style={{ fontSize:16, flexShrink:0 }}>📅</span>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                  style={{ width:'100%',minWidth:0,border:'none',outline:'none',fontSize:13,color:date?'#111827':'#9CA3AF',background:'transparent',fontFamily:'inherit',fontWeight:date?600:400,cursor:'pointer' }}
                />
              </div>
            </label>
            <label style={{ flex:'0 0 45%', display:'block', maxWidth:'45%' }}>
              <div style={{ display:'flex', alignItems:'center', padding:'13px 12px', gap:8 }}>
                <span style={{ fontSize:16, flexShrink:0 }}>👤</span>
                <select
                  value={pax}
                  onChange={e => setPax(+e.target.value)}
                  style={{ width:'100%',minWidth:0,border:'none',outline:'none',fontSize:13,color:'#111827',background:'transparent',cursor:'pointer',fontFamily:'inherit',fontWeight:600 }}>
                  {[1,2,3,4,5,6,7,8].map(n=>(
                    <option key={n} value={n}>{n} pass.</option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          {/* Bouton rechercher */}
          <button
            onClick={handleSearch}
            style={{ width:'100%',padding:'16px',border:'none',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',fontSize:17,fontWeight:800,cursor:'pointer',fontFamily:'inherit',letterSpacing:'-.01em' }}>
            Rechercher
          </button>
        </div>
      </div>

      {/* ── Corps ─────────────────────────────────────────────── */}
      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Trajets populaires */}
        <section>
          <h2 style={{ fontSize:17,fontWeight:800,color:'#111827',margin:'0 0 12px',letterSpacing:'-.02em' }}>
            🔥 Trajets populaires
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {POPULAR_ROUTES.slice(0, 5).map((r, i) => (
              <button
                key={i}
                onClick={() => { setFrom(r.from); setTo(r.to); navigate(`/search?from=${r.from}&to=${r.to}`) }}
                style={{ background:'#fff',borderRadius:14,padding:'14px 16px',border:'1px solid #E5E7EB',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14,boxShadow:'0 1px 4px rgba(0,0,0,.04)',width:'100%',fontFamily:'inherit' }}>
                <div style={{ width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#E8F7F4,#D1F0EA)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                  🚗
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:800,fontSize:15,color:'#111827' }}>{r.from} → {r.to}</div>
                  <div style={{ fontSize:12,color:'#6B7280',marginTop:2 }}>{r.time}</div>
                </div>
                <div style={{ textAlign:'right',flexShrink:0 }}>
                  <div style={{ fontSize:15,fontWeight:800,color:'#1A9E8A' }}>{r.price.toLocaleString('fr-FR')}</div>
                  <div style={{ fontSize:10,color:'#9CA3AF',fontWeight:600 }}>FCFA</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Bannière conducteur */}
        <section style={{ background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',borderRadius:20,padding:'20px',display:'flex',alignItems:'center',gap:16 }}>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11,color:'rgba(255,255,255,.75)',fontWeight:700,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'.05em' }}>
              Vous partez bientôt ?
            </p>
            <h3 style={{ fontSize:18,fontWeight:900,color:'#fff',margin:'0 0 12px',letterSpacing:'-.02em',lineHeight:1.25 }}>
              Publiez votre trajet et partagez les frais
            </h3>
            <button onClick={() => navigate('/publish')}
              style={{ background:'#fff',color:'#1A9E8A',border:'none',borderRadius:22,padding:'10px 20px',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit' }}>
              Proposer un trajet →
            </button>
          </div>
          <div style={{ fontSize:52,flexShrink:0 }}>🚗</div>
        </section>
      </div>
    </div>
  )
}
