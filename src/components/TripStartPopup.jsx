import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// ══════════════════════════════════════════════════════════════
//  TripStartPopup — Pop-up "C'est l'heure de partir !"
//  Polling toutes les minutes pour vérifier les trajets à démarrer
// ══════════════════════════════════════════════════════════════

export default function TripStartPopup({ bookings }) {
  const [trigger, setTrigger] = useState(null)
  const [dismissed, setDismissed] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const check = () => {
      if (!bookings?.length) return
      const now = Date.now()
      const toStart = bookings.find(b => {
        if (b.status !== 'confirmed') return false
        if (b.tracking_status === 'in_progress' || b.tracking_status === 'completed') return false
        if (dismissed.includes(b.id)) return false
        const dep = new Date(b.departure_time).getTime()
        // Fenêtre : 5 min avant à 2h après l'heure prévue
        return dep - now < 300000 && dep - now > -7200000
      })
      setTrigger(toStart || null)
    }
    check()
    const iv = setInterval(check, 60000) // toutes les minutes
    return () => clearInterval(iv)
  }, [bookings, dismissed])

  if (!trigger) return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{
        background:'#fff', borderRadius:24, padding:'32px 24px',
        maxWidth:360, width:'100%', textAlign:'center',
        boxShadow:'0 20px 60px rgba(0,0,0,.4)',
        animation:'popIn .3s ease',
      }}>
        <style>{`@keyframes popIn{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, boxShadow:'0 8px 24px rgba(26,158,138,.4)' }}>
          🚗
        </div>

        <h2 style={{ fontSize:22, fontWeight:900, color:'#111', margin:'0 0 8px' }}>
          C'est l'heure de partir !
        </h2>

        <p style={{ fontSize:14, color:'#6B7280', margin:'0 0 24px', lineHeight:1.5 }}>
          Votre trajet commence maintenant
        </p>

        <div style={{ background:'#F7F8FA', borderRadius:14, padding:'14px 16px', marginBottom:24, textAlign:'left' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', border:'2.5px solid #1A9E8A' }}/>
            <span style={{ fontSize:15, fontWeight:700, color:'#111' }}>{trigger.origin_city}</span>
          </div>
          <div style={{ width:2, height:14, background:'#D1D5DB', margin:'0 4px 2px' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:3, border:'2.5px solid #6B7280' }}/>
            <span style={{ fontSize:15, fontWeight:700, color:'#111' }}>{trigger.destination_city}</span>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={() => { navigate(`/trip/${trigger.id}/navigate`); setTrigger(null) }}
            style={{ padding:'15px', border:'none', borderRadius:14, background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
            Démarrer le trajet
          </button>
          <button onClick={() => { setDismissed(d => [...d, trigger.id]); setTrigger(null) }}
            style={{ padding:'12px', border:'none', borderRadius:14, background:'#F3F4F6', color:'#374151', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  )
}
