import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'
import CityPicker from '../components/CityPicker'

// ══════════════════════════════════════════════════════════════
//  MobilePublish — Publier un trajet (style BlaBlaCar)
//  Étapes : 1. Départ → 2. Arrivée → 3. Date/heure → 4. Places/prix → 5. Récap
// ══════════════════════════════════════════════════════════════

export default function MobilePublish() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    from:     '',
    to:       '',
    date:     '',
    time:     '',
    seats:    3,
    price:    3000,
    vehicle:  '',
    notes:    '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  if (!user) {
    return (
      <div style={{ padding:'80px 24px', textAlign:'center', background:'#F7F8FA', minHeight:'100vh' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
        <h2 style={{ fontSize:20, fontWeight:900, color:'#111827', marginBottom:8 }}>Connexion requise</h2>
        <p style={{ fontSize:14, color:'#6B7280', marginBottom:32 }}>Connectez-vous pour publier un trajet</p>
        <button onClick={() => navigate('/login')}
          style={{ padding:'14px 40px', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none', borderRadius:30, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          Se connecter
        </button>
      </div>
    )
  }

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }))

  const canNext = () => {
    if (step === 0) return !!form.from
    if (step === 1) return !!form.to && form.to !== form.from
    if (step === 2) return !!form.date && !!form.time
    if (step === 3) return form.seats >= 1 && form.price > 0
    return true
  }

  const next = () => { if (canNext()) { setError(''); setStep(s => s + 1) } }
  const prev = () => { setError(''); setStep(s => Math.max(0, s - 1)) }

  const publish = async () => {
    setLoading(true); setError('')
    try {
      const departureTime = `${form.date}T${form.time}:00`
      const res  = await authFetch(`${API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_city:      form.from,
          destination_city: form.to,
          departure_time:   departureTime,
          available_seats:  form.seats,
          price_per_seat:   form.price,
          notes:            form.notes,
          vehicle_info:     form.vehicle,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setTimeout(() => navigate('/my-trips'), 2000)
      } else {
        setError(data.message || 'Erreur de publication')
      }
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"-apple-system,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:96, height:96, borderRadius:'50%', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48, margin:'0 auto 24px', boxShadow:'0 12px 32px rgba(26,158,138,.3)' }}>✓</div>
        <h2 style={{ fontSize:24, fontWeight:900, color:'#111827', marginBottom:10 }}>Trajet publié !</h2>
        <p style={{ fontSize:14, color:'#6B7280' }}>Redirection vers vos trajets…</p>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#fff', minHeight:'100vh', fontFamily:"-apple-system,'SF Pro Display',sans-serif", display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={step > 0 ? prev : () => navigate(-1)}
          style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'#111', padding:0, lineHeight:1, fontWeight:300 }}>
          ‹
        </button>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:11, color:'#9CA3AF', margin:0, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>
            Étape {step + 1} / 5
          </p>
          <p style={{ fontSize:14, fontWeight:800, color:'#111827', margin:'2px 0 0' }}>
            {['Départ','Destination','Date et heure','Places et prix','Récapitulatif'][step]}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:'#F3F4F6' }}>
        <div style={{ height:'100%', width:`${((step+1)/5)*100}%`, background:'linear-gradient(90deg,#1A9E8A,#22C6AD)', transition:'width .3s' }}/>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:'28px 20px', overflowY:'auto' }}>

        {step === 0 && (
          <>
            <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 8px', letterSpacing:'-.03em', lineHeight:1.2 }}>
              D'où partez-vous ?
            </h1>
            <p style={{ fontSize:14, color:'#6B7280', margin:'0 0 24px' }}>
              Sélectionnez votre ville de départ
            </p>
            <div style={{ border:'2px solid #E5E7EB', borderRadius:16, padding:'18px 16px' }}>
              <CityPicker value={form.from} onChange={set('from')} placeholder="Ville de départ" exclude={form.to}/>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 8px', letterSpacing:'-.03em', lineHeight:1.2 }}>
              Où allez-vous ?
            </h1>
            <p style={{ fontSize:14, color:'#6B7280', margin:'0 0 24px' }}>
              Sélectionnez votre destination
            </p>
            <div style={{ background:'#F7F8FA', borderRadius:12, padding:'12px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:10,height:10,borderRadius:'50%',border:'2.5px solid #1A9E8A' }}/>
              <span style={{ fontSize:14, color:'#374151', fontWeight:600 }}>{form.from}</span>
            </div>
            <div style={{ border:'2px solid #E5E7EB', borderRadius:16, padding:'18px 16px' }}>
              <CityPicker value={form.to} onChange={set('to')} placeholder="Ville de destination" exclude={form.from}/>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 8px', letterSpacing:'-.03em', lineHeight:1.2 }}>
              Quand partez-vous ?
            </h1>
            <p style={{ fontSize:14, color:'#6B7280', margin:'0 0 24px' }}>
              Choisissez la date et l'heure de départ
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#6B7280', margin:'0 0 6px' }}>📅 Date</p>
                <input type="date" value={form.date} min={today} onChange={e=>set('date')(e.target.value)}
                  style={{ width:'100%', padding:'16px', border:'2px solid #E5E7EB', borderRadius:14, fontSize:16, fontFamily:'inherit', outline:'none', boxSizing:'border-box', fontWeight:600, color:'#111' }}/>
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#6B7280', margin:'0 0 6px' }}>🕐 Heure</p>
                <input type="time" value={form.time} onChange={e=>set('time')(e.target.value)}
                  style={{ width:'100%', padding:'16px', border:'2px solid #E5E7EB', borderRadius:14, fontSize:16, fontFamily:'inherit', outline:'none', boxSizing:'border-box', fontWeight:600, color:'#111' }}/>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 8px', letterSpacing:'-.03em', lineHeight:1.2 }}>
              Places et prix
            </h1>
            <p style={{ fontSize:14, color:'#6B7280', margin:'0 0 24px' }}>
              Combien de passagers et à quel prix ?
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'#F7F8FA', borderRadius:16, padding:'18px' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#6B7280', margin:'0 0 12px' }}>Places disponibles</p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <button onClick={() => set('seats')(Math.max(1, form.seats - 1))}
                    style={{ width:48, height:48, borderRadius:'50%', border:'2px solid #E5E7EB', background:'#fff', fontSize:24, cursor:'pointer' }}>−</button>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:40, fontWeight:900, color:'#111' }}>{form.seats}</div>
                    <div style={{ fontSize:12, color:'#9CA3AF' }}>passager{form.seats > 1 ? 's' : ''}</div>
                  </div>
                  <button onClick={() => set('seats')(Math.min(8, form.seats + 1))}
                    style={{ width:48, height:48, borderRadius:'50%', border:'2px solid #1A9E8A', background:'#1A9E8A', color:'#fff', fontSize:24, cursor:'pointer' }}>+</button>
                </div>
              </div>

              <div style={{ background:'#F7F8FA', borderRadius:16, padding:'18px' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#6B7280', margin:'0 0 12px' }}>Prix par place</p>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => set('price')(+e.target.value)}
                    step={500}
                    min={500}
                    style={{ flex:1, padding:'14px', border:'2px solid #E5E7EB', borderRadius:12, fontSize:18, fontFamily:'inherit', outline:'none', fontWeight:800, textAlign:'center', color:'#1A9E8A' }}
                  />
                  <span style={{ fontSize:16, fontWeight:700, color:'#111' }}>FCFA</span>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  {[1500, 2500, 3500, 5000].map(p => (
                    <button key={p} onClick={() => set('price')(p)}
                      style={{ padding:'8px 14px', borderRadius:20, border: form.price === p ? '2px solid #1A9E8A' : '1.5px solid #E5E7EB', background: form.price === p ? '#E8F7F4' : '#fff', fontSize:12, fontWeight:700, color: form.price === p ? '#1A9E8A' : '#374151', cursor:'pointer', fontFamily:'inherit' }}>
                      {p.toLocaleString('fr-FR')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#6B7280', margin:'0 0 6px' }}>💭 Note (optionnel)</p>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes')(e.target.value)}
                  placeholder="Ex: départ devant la gare à 8h pile"
                  rows={3}
                  style={{ width:'100%', padding:'14px', border:'2px solid #E5E7EB', borderRadius:14, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', resize:'vertical' }}
                />
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', margin:'0 0 8px', letterSpacing:'-.03em', lineHeight:1.2 }}>
              Vérifiez et publiez
            </h1>
            <p style={{ fontSize:14, color:'#6B7280', margin:'0 0 24px' }}>
              Tout est correct ?
            </p>

            {/* Récapitulatif */}
            <div style={{ background:'#F7F8FA', borderRadius:16, padding:'20px', marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ width:12, height:12, borderRadius:'50%', border:'2.5px solid #1A9E8A', marginTop:3 }}/>
                  <div style={{ width:2, height:32, background:'#D1D5DB', margin:'4px 0' }}/>
                  <div style={{ width:12, height:12, borderRadius:3, border:'2.5px solid #6B7280' }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#111' }}>{form.from}</div>
                  <div style={{ fontSize:12, color:'#6B7280', margin:'4px 0 20px' }}>
                    {new Date(`${form.date}T${form.time}`).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })} à {form.time}
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#111' }}>{form.to}</div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              <div style={{ flex:1, background:'#F7F8FA', borderRadius:14, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:26, fontWeight:900, color:'#111' }}>{form.seats}</div>
                <div style={{ fontSize:11, color:'#6B7280', marginTop:4, fontWeight:600 }}>Place{form.seats>1?'s':''}</div>
              </div>
              <div style={{ flex:1, background:'#F7F8FA', borderRadius:14, padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:900, color:'#1A9E8A' }}>{Number(form.price).toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:11, color:'#6B7280', marginTop:4, fontWeight:600 }}>FCFA/place</div>
              </div>
            </div>

            {form.notes && (
              <div style={{ background:'#FFFBEB', borderLeft:'3px solid #F59E0B', padding:'12px 14px', borderRadius:8, marginBottom:16, fontSize:13, color:'#78350F' }}>
                💭 {form.notes}
              </div>
            )}

            {error && (
              <div style={{ background:'#FEF2F2', borderRadius:12, padding:14, color:'#DC2626', fontSize:13, marginBottom:16 }}>
                ⚠️ {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bouton bas */}
      <div style={{ padding:'12px 20px 24px', borderTop:'1px solid #F3F4F6', background:'#fff' }}>
        {step < 4 ? (
          <button onClick={next} disabled={!canNext()}
            style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background: canNext() ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#E5E7EB', color:'#fff', fontSize:16, fontWeight:800, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            Continuer
          </button>
        ) : (
          <button onClick={publish} disabled={loading}
            style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            {loading ? 'Publication…' : '🚗 Publier le trajet'}
          </button>
        )}
      </div>
    </div>
  )
}
