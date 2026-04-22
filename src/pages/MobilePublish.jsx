import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'
import { MAJOR_CITIES } from '../data/cameroun'

const STEPS = ['Départ', 'Destination', 'Date & heure', 'Places & prix', 'Récap']

const PREFS_LIST = ['Climatisé','Musique ok','Animaux ok','Silencieux','Non-fumeur','Chargeur USB']

export default function MobilePublish() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    from:'', to:'', date:'', time:'', seats:3, price:3000, notes:'', prefs:[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"-apple-system,sans-serif"}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:56,marginBottom:16}}>🔒</div>
        <h2 style={{fontSize:20,fontWeight:900,color:'#111',marginBottom:8}}>Connexion requise</h2>
        <p style={{fontSize:14,color:'#6B7280',marginBottom:28}}>Connectez-vous pour publier un trajet</p>
        <button onClick={()=>navigate('/login')} style={{padding:'14px 36px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:30,fontSize:15,fontWeight:800,cursor:'pointer'}}>
          Se connecter
        </button>
      </div>
    </div>
  )

  if (success) return (
    <div style={{minHeight:'100vh',background:'#F7F8FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"-apple-system,sans-serif"}}>
      <div style={{textAlign:'center',padding:32}}>
        <div style={{width:96,height:96,borderRadius:'50%',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,margin:'0 auto 24px',boxShadow:'0 12px 32px rgba(26,158,138,.3)'}}>✓</div>
        <h2 style={{fontSize:24,fontWeight:900,color:'#111',marginBottom:8}}>Trajet publié !</h2>
        <p style={{fontSize:14,color:'#6B7280'}}>Redirection en cours…</p>
      </div>
    </div>
  )

  const upd = (k,v) => { setForm(f=>({...f,[k]:v})); setError('') }

  const canNext = [
    () => !!form.from,
    () => !!form.to && form.to !== form.from,
    () => !!form.date && !!form.time,
    () => form.seats >= 1 && form.price >= 500,
    () => true,
  ][step]

  const next = () => canNext() && setStep(s=>s+1)
  const prev = () => setStep(s=>Math.max(0,s-1))

  const publish = async () => {
    setLoading(true); setError('')
    try {
      // Le backend attend : from, to, departureAt, price, totalSeats, prefs, description
      const departureAt = new Date(`${form.date}T${form.time}:00`).toISOString()
      const res = await authFetch(`${API_URL}/api/trips`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          from:         form.from,
          to:           form.to,
          departureAt,
          price:        form.price,
          totalSeats:   form.seats,
          prefs:        form.prefs,
          description:  form.notes,
          // champs alternatifs si le backend attend snake_case
          origin_city:       form.from,
          destination_city:  form.to,
          departure_time:    departureAt,
          price_per_seat:    form.price,
          available_seats:   form.seats,
          preferences:       form.prefs,
          notes:             form.notes,
        }),
      })
      const data = await res.json()
      if (data.success || data.id || data.trip) {
        setSuccess(true)
        setTimeout(()=>navigate('/my-trips'), 2000)
      } else {
        setError(data.message || 'Erreur lors de la publication')
      }
    } catch { setError('Impossible de contacter le serveur.') }
    finally  { setLoading(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{minHeight:'100vh',background:'#fff',fontFamily:"-apple-system,'SF Pro Display',sans-serif",display:'flex',flexDirection:'column'}}>

      {/* Header */}
      <div style={{padding:'14px 20px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={step>0?prev:()=>navigate('/')}
          style={{background:'none',border:'none',fontSize:26,cursor:'pointer',color:'#111',padding:0,lineHeight:1}}>‹</button>
        <div style={{flex:1}}>
          <p style={{fontSize:11,color:'#9CA3AF',margin:0,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em'}}>
            Étape {step+1} sur {STEPS.length}
          </p>
          <p style={{fontSize:15,fontWeight:800,color:'#111',margin:'2px 0 0'}}>{STEPS[step]}</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{height:3,background:'#F3F4F6'}}>
        <div style={{height:'100%',width:`${((step+1)/STEPS.length)*100}%`,background:'linear-gradient(90deg,#1A9E8A,#22C6AD)',transition:'width .35s ease'}}/>
      </div>

      {/* Contenu */}
      <div style={{flex:1,padding:'28px 20px',overflowY:'auto'}}>

        {/* Étape 0 — Départ */}
        {step===0 && <>
          <h1 style={{fontSize:26,fontWeight:900,color:'#111',margin:'0 0 6px',letterSpacing:'-.02em'}}>D'où partez-vous ?</h1>
          <p style={{fontSize:14,color:'#6B7280',margin:'0 0 28px'}}>Sélectionnez votre ville de départ</p>
          <CitySelect label="Ville de départ" value={form.from} exclude={form.to}
            onChange={v=>upd('from',v)}/>
        </>}

        {/* Étape 1 — Destination */}
        {step===1 && <>
          <h1 style={{fontSize:26,fontWeight:900,color:'#111',margin:'0 0 6px',letterSpacing:'-.02em'}}>Où allez-vous ?</h1>
          <p style={{fontSize:14,color:'#6B7280',margin:'0 0 20px'}}>Sélectionnez votre destination</p>
          <div style={{background:'#F7F8FA',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',border:'2.5px solid #1A9E8A',flexShrink:0}}/>
            <span style={{fontSize:15,fontWeight:700,color:'#374151'}}>{form.from}</span>
          </div>
          <CitySelect label="Destination" value={form.to} exclude={form.from}
            onChange={v=>upd('to',v)}/>
        </>}

        {/* Étape 2 — Date & heure */}
        {step===2 && <>
          <h1 style={{fontSize:26,fontWeight:900,color:'#111',margin:'0 0 6px',letterSpacing:'-.02em'}}>Quand partez-vous ?</h1>
          <p style={{fontSize:14,color:'#6B7280',margin:'0 0 28px'}}>Date et heure de départ</p>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 8px'}}>📅 Date</p>
              <input type="date" value={form.date} min={today} onChange={e=>upd('date',e.target.value)}
                style={{width:'100%',padding:'16px',border:'2px solid '+(form.date?'#1A9E8A':'#E5E7EB'),borderRadius:14,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box',fontWeight:600,color:'#111'}}/>
            </div>
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 8px'}}>🕐 Heure</p>
              <input type="time" value={form.time} onChange={e=>upd('time',e.target.value)}
                style={{width:'100%',padding:'16px',border:'2px solid '+(form.time?'#1A9E8A':'#E5E7EB'),borderRadius:14,fontSize:16,fontFamily:'inherit',outline:'none',boxSizing:'border-box',fontWeight:600,color:'#111'}}/>
            </div>
          </div>
        </>}

        {/* Étape 3 — Places & prix */}
        {step===3 && <>
          <h1 style={{fontSize:26,fontWeight:900,color:'#111',margin:'0 0 6px',letterSpacing:'-.02em'}}>Places et prix</h1>
          <p style={{fontSize:14,color:'#6B7280',margin:'0 0 24px'}}>Combien de places et à quel prix ?</p>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>

            {/* Compteur places */}
            <div style={{background:'#F7F8FA',borderRadius:18,padding:'20px'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 16px'}}>Places disponibles</p>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <button onClick={()=>upd('seats',Math.max(1,form.seats-1))}
                  style={{width:48,height:48,borderRadius:'50%',border:'2px solid #E5E7EB',background:'#fff',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>−</button>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:48,fontWeight:900,color:'#111',lineHeight:1}}>{form.seats}</div>
                  <div style={{fontSize:12,color:'#9CA3AF',marginTop:4}}>place{form.seats>1?'s':''}</div>
                </div>
                <button onClick={()=>upd('seats',Math.min(8,form.seats+1))}
                  style={{width:48,height:48,borderRadius:'50%',border:'2px solid #1A9E8A',background:'#1A9E8A',color:'#fff',fontSize:24,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
              </div>
            </div>

            {/* Prix */}
            <div style={{background:'#F7F8FA',borderRadius:18,padding:'20px'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 12px'}}>Prix par place</p>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <input type="number" value={form.price} min={500} step={500} onChange={e=>upd('price',Math.max(500,+e.target.value))}
                  style={{flex:1,padding:'14px',border:'2px solid #1A9E8A',borderRadius:12,fontSize:20,fontFamily:'inherit',outline:'none',fontWeight:900,textAlign:'center',color:'#1A9E8A'}}/>
                <span style={{fontSize:16,fontWeight:700,color:'#374151',whiteSpace:'nowrap'}}>FCFA</span>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[1500,2500,3500,5000,8000].map(p=>(
                  <button key={p} onClick={()=>upd('price',p)}
                    style={{padding:'8px 14px',borderRadius:20,border:form.price===p?'2px solid #1A9E8A':'1.5px solid #E5E7EB',background:form.price===p?'#E8F7F4':'#fff',fontSize:12,fontWeight:700,color:form.price===p?'#1A9E8A':'#374151',cursor:'pointer',fontFamily:'inherit'}}>
                    {p.toLocaleString('fr-FR')}
                  </button>
                ))}
              </div>
            </div>

            {/* Préférences */}
            <div style={{background:'#F7F8FA',borderRadius:18,padding:'20px'}}>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 12px'}}>Préférences (optionnel)</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {PREFS_LIST.map(p=>{
                  const on = form.prefs.includes(p)
                  return <button key={p} onClick={()=>upd('prefs',on?form.prefs.filter(x=>x!==p):[...form.prefs,p])}
                    style={{padding:'8px 14px',borderRadius:20,border:on?'2px solid #1A9E8A':'1.5px solid #E5E7EB',background:on?'#E8F7F4':'#fff',fontSize:12,fontWeight:700,color:on?'#1A9E8A':'#374151',cursor:'pointer',fontFamily:'inherit'}}>
                    {p}
                  </button>
                })}
              </div>
            </div>

            {/* Note */}
            <div>
              <p style={{fontSize:13,fontWeight:700,color:'#6B7280',margin:'0 0 8px'}}>💬 Message aux passagers (optionnel)</p>
              <textarea value={form.notes} onChange={e=>upd('notes',e.target.value)}
                placeholder="Ex: Départ depuis la gare routière…" rows={3}
                style={{width:'100%',padding:'14px',border:'2px solid #E5E7EB',borderRadius:14,fontSize:14,fontFamily:'inherit',outline:'none',boxSizing:'border-box',resize:'vertical',color:'#111'}}/>
            </div>
          </div>
        </>}

        {/* Étape 4 — Récap */}
        {step===4 && <>
          <h1 style={{fontSize:26,fontWeight:900,color:'#111',margin:'0 0 6px',letterSpacing:'-.02em'}}>Tout est correct ?</h1>
          <p style={{fontSize:14,color:'#6B7280',margin:'0 0 24px'}}>Vérifiez avant de publier</p>

          <div style={{background:'#F7F8FA',borderRadius:18,padding:'20px',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',paddingTop:3,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:'50%',border:'2.5px solid #1A9E8A'}}/>
                <div style={{width:2,height:32,background:'#D1D5DB',margin:'4px 0'}}/>
                <div style={{width:10,height:10,borderRadius:3,border:'2.5px solid #6B7280'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:17,fontWeight:800,color:'#111'}}>{form.from}</div>
                <div style={{fontSize:12,color:'#6B7280',margin:'2px 0 16px'}}>
                  {form.date && new Date(`${form.date}T${form.time||'00:00'}`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})} à {form.time}
                </div>
                <div style={{fontSize:17,fontWeight:800,color:'#111'}}>{form.to}</div>
              </div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div style={{background:'#F7F8FA',borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:32,fontWeight:900,color:'#111'}}>{form.seats}</div>
              <div style={{fontSize:11,color:'#6B7280',marginTop:4,fontWeight:600}}>place{form.seats>1?'s':''}</div>
            </div>
            <div style={{background:'#F7F8FA',borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:24,fontWeight:900,color:'#1A9E8A'}}>{Number(form.price).toLocaleString('fr-FR')}</div>
              <div style={{fontSize:11,color:'#6B7280',marginTop:4,fontWeight:600}}>FCFA / place</div>
            </div>
          </div>

          {form.prefs.length>0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:16}}>
              {form.prefs.map(p=><span key={p} style={{background:'#E8F7F4',color:'#0f766e',padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>{p}</span>)}
            </div>
          )}
          {form.notes && (
            <div style={{background:'#FFFBEB',borderLeft:'3px solid #F59E0B',padding:'12px 14px',borderRadius:8,fontSize:13,color:'#78350F'}}>
              💬 {form.notes}
            </div>
          )}
          {error && <div style={{marginTop:16,padding:14,background:'#FEF2F2',borderRadius:12,color:'#DC2626',fontSize:13}}>⚠️ {error}</div>}
        </>}
      </div>

      {/* Bouton bas */}
      <div style={{padding:'12px 20px',borderTop:'1px solid #F3F4F6',background:'#fff',paddingBottom:'calc(12px + env(safe-area-inset-bottom))'}}>
        {step<4
          ? <button onClick={next} disabled={!canNext()}
              style={{width:'100%',padding:'16px',border:'none',borderRadius:14,background:canNext()?'linear-gradient(135deg,#1A9E8A,#22C6AD)':'#E5E7EB',color:'#fff',fontSize:16,fontWeight:800,cursor:canNext()?'pointer':'not-allowed',fontFamily:'inherit',transition:'background .2s'}}>
              Continuer
            </button>
          : <button onClick={publish} disabled={loading}
              style={{width:'100%',padding:'16px',border:'none',borderRadius:14,background:loading?'#9CA3AF':'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',fontFamily:'inherit'}}>
              {loading ? '⏳ Publication…' : '🚗 Publier le trajet'}
            </button>
        }
      </div>
    </div>
  )
}

function CitySelect({ label, value, onChange, exclude }) {
  return (
    <div style={{border:'2px solid '+(value?'#1A9E8A':'#E5E7EB'),borderRadius:16,padding:'4px 0',transition:'border-color .2s'}}>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:'100%',padding:'16px 18px',border:'none',background:'transparent',fontSize:16,fontFamily:'inherit',outline:'none',color:value?'#111':'#9CA3AF',fontWeight:value?700:400,cursor:'pointer',appearance:'auto'}}>
        <option value="">{label}</option>
        {MAJOR_CITIES.filter(c=>c!==exclude).map(c=><option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}
