import { useState } from 'react'
import { API_URL, authFetch } from '../utils/api'

export default function ReviewModal({ bookingId, driverName, from, to, onClose, onSubmit }) {
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')

  const labels = ['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent !']

  const handleSubmit = async () => {
    if (!rating) { setError('Sélectionnez une note.'); return }
    setSending(true)
    try {
      const res  = await authFetch(`${API_URL}/api/reviews`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, rating, comment }),
      })
      const data = await res.json()
      if (data.success) onSubmit?.()
      else setError(data.message)
    } catch { setError('Impossible de contacter le serveur.') }
    finally { setSending(false) }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, backdropFilter:'blur(3px)' }}/>
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        background:'#fff', borderRadius:20, padding:'32px 28px', width:'100%', maxWidth:420,
        zIndex:1001, boxShadow:'0 24px 64px rgba(0,0,0,.2)', fontFamily:"'Plus Jakarta Sans',sans-serif",
        animation:'fadeUp .25s ease both',
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>

        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>⭐</div>
          <h2 style={{ fontSize:20, fontWeight:900, color:'#1A1A1A', margin:'0 0 6px' }}>
            Notez votre trajet
          </h2>
          <p style={{ fontSize:13, color:'#6B7280', margin:0 }}>
            Trajet avec <strong>{driverName}</strong> · {from} → {to}
          </p>
        </div>

        {/* Étoiles */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:8 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:40, lineHeight:1, padding:2, transition:'transform .15s', transform: (hover||rating) >= s ? 'scale(1.15)' : 'scale(1)' }}>
              <span style={{ color: (hover||rating) >= s ? '#F59E0B' : '#E2E8F0' }}>★</span>
            </button>
          ))}
        </div>
        <div style={{ textAlign:'center', height:20, fontSize:14, fontWeight:700, color:'#F59E0B', marginBottom:20 }}>
          {labels[hover || rating]}
        </div>

        {/* Commentaire */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Décrivez votre expérience (optionnel)..."
          maxLength={500}
          rows={3}
          style={{ width:'100%', boxSizing:'border-box', padding:'11px 14px', border:'1.5px solid rgba(0,0,0,.12)', borderRadius:12, fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', lineHeight:1.6 }}
        />
        <div style={{ textAlign:'right', fontSize:11, color:'#bbb', marginTop:4, marginBottom:16 }}>{comment.length}/500</div>

        {error && <div style={{ background:'#FEF2F2', color:'#DC2626', borderRadius:9, padding:'9px 12px', fontSize:13, fontWeight:600, marginBottom:14 }}>⚠️ {error}</div>}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid rgba(0,0,0,.1)', background:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', color:'#555' }}>
            Plus tard
          </button>
          <button onClick={handleSubmit} disabled={sending || !rating}
            style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background: rating ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#E2E8F0', color: rating ? '#fff' : '#94A3B8', fontSize:14, fontWeight:800, cursor: rating ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
            {sending ? '…' : '✅ Envoyer mon avis'}
          </button>
        </div>
      </div>
    </>
  )
}
