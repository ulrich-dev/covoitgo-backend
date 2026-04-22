import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'
import { MAJOR_CITIES } from '../data/cameroun'

const PREFS_LIST = ['Climatisé','Musique ok','Animaux ok','Silencieux','Non-fumeur','Chargeur USB']

export default function PublishTrip() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    from:'', to:'', date:'', time:'', seats:3, price:3000, notes:'', prefs:[],
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  if (!user) return (
    <div style={{maxWidth:500,margin:'80px auto',padding:'0 24px',textAlign:'center',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{fontSize:56,marginBottom:16}}>🔒</div>
      <h2 style={{fontSize:22,fontWeight:900,color:'#111',marginBottom:8}}>Connexion requise</h2>
      <p style={{fontSize:14,color:'#6B7280',marginBottom:28}}>Connectez-vous pour publier un trajet</p>
      <button onClick={()=>navigate('/login')} style={{padding:'14px 36px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:30,fontSize:15,fontWeight:800,cursor:'pointer'}}>
        Se connecter
      </button>
    </div>
  )

  if (success) return (
    <div style={{maxWidth:500,margin:'80px auto',padding:'0 24px',textAlign:'center',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{width:96,height:96,borderRadius:'50%',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,margin:'0 auto 24px',boxShadow:'0 12px 32px rgba(26,158,138,.3)'}}>✓</div>
      <h2 style={{fontSize:24,fontWeight:900,color:'#111',marginBottom:8}}>Trajet publié !</h2>
      <p style={{fontSize:14,color:'#6B7280'}}>Redirection vers vos trajets…</p>
    </div>
  )

  const upd = (k,v) => { setForm(f=>({...f,[k]:v})); setError('') }
  const togglePref = (p) => upd('prefs', form.prefs.includes(p) ? form.prefs.filter(x=>x!==p) : [...form.prefs,p])

  const canPublish = form.from && form.to && form.from!==form.to && form.date && form.time && form.seats>=1 && form.price>=500

  const publish = async (e) => {
    e.preventDefault()
    if (!canPublish) { setError('Veuillez remplir tous les champs obligatoires'); return }
    setLoading(true); setError('')
    try {
      const departureAt = new Date(`${form.date}T${form.time}:00`).toISOString()
      const res = await authFetch(`${API_URL}/api/trips`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          from:             form.from,
          to:               form.to,
          departureAt,
          price:            form.price,
          totalSeats:       form.seats,
          prefs:            form.prefs,
          description:      form.notes,
          // fallback snake_case
          origin_city:      form.from,
          destination_city: form.to,
          departure_time:   departureAt,
          price_per_seat:   form.price,
          available_seats:  form.seats,
          preferences:      form.prefs,
          notes:            form.notes,
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

  return (
    <div style={{background:'#F7F5F2',minHeight:'calc(100vh - 72px)',fontFamily:"'Plus Jakarta Sans',sans-serif",padding:'32px 20px'}}>
      <div style={{maxWidth:680,margin:'0 auto'}}>

        <h1 style={{fontSize:28,fontWeight:900,color:'#111',marginBottom:6,letterSpacing:'-.03em'}}>Publier un trajet</h1>
        <p style={{fontSize:14,color:'#6B7280',marginBottom:28}}>Partagez votre trajet et les frais avec des passagers</p>

        <form onSubmit={publish} style={{display:'flex',flexDirection:'column',gap:20}}>

          {/* Départ / Arrivée */}
          <div style={{background:'#fff',borderRadius:18,padding:'24px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#111',margin:'0 0 16px'}}>🗺️ Trajet</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'center'}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>DÉPART *</label>
                <select value={form.from} onChange={e=>upd('from',e.target.value)}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid '+(form.from?'#1A9E8A':'#E5E7EB'),borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',color:form.from?'#111':'#9CA3AF',transition:'border-color .2s'}}>
                  <option value="">Ville de départ</option>
                  {MAJOR_CITIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{fontSize:20,color:'#9CA3AF',fontWeight:700,paddingTop:22}}>→</div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>DESTINATION *</label>
                <select value={form.to} onChange={e=>upd('to',e.target.value)}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid '+(form.to?'#1A9E8A':'#E5E7EB'),borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',color:form.to?'#111':'#9CA3AF',transition:'border-color .2s'}}>
                  <option value="">Destination</option>
                  {MAJOR_CITIES.filter(c=>c!==form.from).map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {form.from && form.to && form.from===form.to && (
              <p style={{fontSize:12,color:'#EF4444',marginTop:8}}>⚠️ Le départ et la destination doivent être différents</p>
            )}
          </div>

          {/* Date & heure */}
          <div style={{background:'#fff',borderRadius:18,padding:'24px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#111',margin:'0 0 16px'}}>📅 Date et heure de départ</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>DATE *</label>
                <input type="date" value={form.date} min={today} onChange={e=>upd('date',e.target.value)}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid '+(form.date?'#1A9E8A':'#E5E7EB'),borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',transition:'border-color .2s',boxSizing:'border-box',fontWeight:form.date?600:400}}/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>HEURE *</label>
                <input type="time" value={form.time} onChange={e=>upd('time',e.target.value)}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid '+(form.time?'#1A9E8A':'#E5E7EB'),borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',transition:'border-color .2s',boxSizing:'border-box',fontWeight:form.time?600:400}}/>
              </div>
            </div>
          </div>

          {/* Places & prix */}
          <div style={{background:'#fff',borderRadius:18,padding:'24px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#111',margin:'0 0 16px'}}>🎫 Places et tarif</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>PLACES DISPONIBLES *</label>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <button type="button" onClick={()=>upd('seats',Math.max(1,form.seats-1))}
                    style={{width:40,height:40,borderRadius:'50%',border:'1.5px solid #E5E7EB',background:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>−</button>
                  <span style={{fontSize:28,fontWeight:900,color:'#111',minWidth:32,textAlign:'center'}}>{form.seats}</span>
                  <button type="button" onClick={()=>upd('seats',Math.min(8,form.seats+1))}
                    style={{width:40,height:40,borderRadius:'50%',border:'1.5px solid #1A9E8A',background:'#1A9E8A',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>PRIX PAR PLACE (FCFA) *</label>
                <input type="number" value={form.price} min={500} step={500} onChange={e=>upd('price',Math.max(500,+e.target.value))}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:16,fontFamily:'inherit',outline:'none',fontWeight:800,color:'#1A9E8A',boxSizing:'border-box'}}/>
                <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                  {[1500,2500,3500,5000].map(p=>(
                    <button key={p} type="button" onClick={()=>upd('price',p)}
                      style={{padding:'5px 10px',borderRadius:16,border:form.price===p?'2px solid #1A9E8A':'1px solid #E5E7EB',background:form.price===p?'#E8F7F4':'transparent',fontSize:11,fontWeight:700,color:form.price===p?'#1A9E8A':'#6B7280',cursor:'pointer'}}>
                      {p.toLocaleString('fr-FR')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Préférences */}
          <div style={{background:'#fff',borderRadius:18,padding:'24px',border:'1px solid #E5E7EB',boxShadow:'0 1px 4px rgba(0,0,0,.04)'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#111',margin:'0 0 16px'}}>✨ Préférences (optionnel)</h3>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>
              {PREFS_LIST.map(p=>(
                <button key={p} type="button" onClick={()=>togglePref(p)}
                  style={{padding:'9px 16px',borderRadius:24,border:form.prefs.includes(p)?'2px solid #1A9E8A':'1.5px solid #E5E7EB',background:form.prefs.includes(p)?'#E8F7F4':'transparent',fontSize:13,fontWeight:700,color:form.prefs.includes(p)?'#0f766e':'#374151',cursor:'pointer',transition:'all .15s'}}>
                  {p}
                </button>
              ))}
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:700,color:'#6B7280',display:'block',marginBottom:6}}>MESSAGE AUX PASSAGERS</label>
              <textarea value={form.notes} onChange={e=>upd('notes',e.target.value)}
                placeholder="Indiquez un point de rendez-vous, des bagages autorisés, des arrêts prévus…" rows={3}
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:14,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',color:'#111'}}/>
            </div>
          </div>

          {error && (
            <div style={{padding:16,background:'#FEF2F2',borderRadius:12,color:'#DC2626',fontSize:14}}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={!canPublish||loading}
            style={{padding:'16px',border:'none',borderRadius:14,background:canPublish&&!loading?'linear-gradient(135deg,#1A9E8A,#22C6AD)':'#E5E7EB',color:'#fff',fontSize:16,fontWeight:800,cursor:canPublish&&!loading?'pointer':'not-allowed',fontFamily:'inherit',transition:'background .2s'}}>
            {loading ? '⏳ Publication en cours…' : '🚗 Publier le trajet'}
          </button>
        </form>
      </div>
    </div>
  )
}
