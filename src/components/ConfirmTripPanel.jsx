import { useState } from 'react'
import { API_URL, authFetch } from '../utils/api'

export default function ConfirmTripPanel({ bookingId, isDriver, driverConfirmed, passengerConfirmed, onUpdated }) {
  const [loading,    setLoading]    = useState(false)
  const [disputing,  setDisputing]  = useState(false)
  const [reason,     setReason]     = useState('')
  const [message,    setMessage]    = useState('')
  const [error,      setError]      = useState('')

  const iHaveConfirmed = isDriver ? driverConfirmed : passengerConfirmed
  const otherConfirmed = isDriver ? passengerConfirmed : driverConfirmed

  const confirm = async () => {
    setLoading(true); setError(''); setMessage('')
    try {
      const res  = await authFetch(`${API_URL}/api/confirm/${bookingId}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        setMessage(data.message)
        onUpdated?.()
      } else setError(data.message)
    } catch { setError('Erreur serveur.') }
    finally { setLoading(false) }
  }

  const dispute = async () => {
    if (!reason.trim()) { setError('Veuillez expliquer le motif du litige.'); return }
    setLoading(true); setError('')
    try {
      const res  = await authFetch(`${API_URL}/api/confirm/${bookingId}/dispute`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (data.success) { setMessage(data.message); setDisputing(false); onUpdated?.() }
      else setError(data.message)
    } catch { setError('Erreur serveur.') }
    finally { setLoading(false) }
  }

  // ── Tous les deux ont confirmé ───────────────────────────────
  if (driverConfirmed && passengerConfirmed) {
    return (
      <div style={{ background: 'linear-gradient(135deg,#E8F7F4,#D1F0EA)', border: '1.5px solid rgba(26,158,138,.25)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1A9E8A' }}>Trajet validé par les deux parties</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Le trajet est officiellement terminé.</div>
        </div>
      </div>
    )
  }

  // ── J'ai déjà confirmé, en attente de l'autre ──────────────
  if (iHaveConfirmed && !otherConfirmed) {
    return (
      <div style={{ background: '#FFFBEB', border: '1.5px solid rgba(245,158,11,.25)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#D97706' }}>Votre confirmation est enregistrée</div>
            <div style={{ fontSize: 11, color: '#92400E' }}>
              En attente de la confirmation de l'autre partie.<br/>
              Validation automatique dans 24h si aucune réponse.
            </div>
          </div>
        </div>
        {/* Indicateur visuel */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 6, borderRadius: 4, background: isDriver ? '#1A9E8A' : '#E2E8F0', marginBottom: 4 }}/>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDriver ? '#1A9E8A' : '#94A3B8' }}>Conducteur</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 6, borderRadius: 4, background: !isDriver ? '#1A9E8A' : '#E2E8F0', marginBottom: 4 }}/>
            <div style={{ fontSize: 10, fontWeight: 700, color: !isDriver ? '#1A9E8A' : '#94A3B8' }}>Passager</div>
          </div>
        </div>
      </div>
    )
  }

  // ── L'autre a confirmé, je n'ai pas encore confirmé ───────
  if (otherConfirmed && !iHaveConfirmed) {
    return (
      <div style={{ background: '#F0FDF4', border: '1.5px solid rgba(22,163,74,.25)', borderRadius: 12, padding: '14px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🤝</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>
              {isDriver ? 'Le passager a confirmé le trajet' : 'Le conducteur a confirmé le trajet'}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              Confirmez à votre tour pour valider définitivement.
            </div>
          </div>
        </div>

        {!disputing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirm} disabled={loading}
              style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? '…' : '✅ Confirmer le trajet'}
            </button>
            <button onClick={() => setDisputing(true)} disabled={loading}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid rgba(239,68,68,.3)', background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ❌ Contester
            </button>
          </div>
        ) : (
          <div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Expliquez pourquoi vous contestez ce trajet…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid rgba(239,68,68,.3)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none' }}/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setDisputing(false); setReason('') }}
                style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#555' }}>
                Annuler
              </button>
              <button onClick={dispute} disabled={loading}
                style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {loading ? '…' : '⚠️ Soumettre le litige'}
              </button>
            </div>
          </div>
        )}

        {error   && <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, marginTop: 10 }}>⚠️ {error}</div>}
        {message && <div style={{ background: '#E8F7F4', color: '#1A9E8A', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginTop: 10 }}>{message}</div>}
      </div>
    )
  }

  // ── Aucun n'a confirmé — proposer la confirmation ──────────
  return (
    <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>🚗</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>Ce trajet a-t-il eu lieu ?</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 1.5 }}>
            Confirmez que le trajet a bien été effectué. L'autre partie devra confirmer également.<br/>
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>Validation automatique 24h après si l'autre partie confirme seule.</span>
          </div>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Conducteur', done: driverConfirmed },
          { label: 'Passager',   done: passengerConfirmed },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 6, borderRadius: 4, background: s.done ? '#1A9E8A' : '#E2E8F0', marginBottom: 4, transition: 'background .3s' }}/>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.done ? '#1A9E8A' : '#94A3B8' }}>
              {s.done ? '✅' : '⬜'} {s.label}
            </div>
          </div>
        ))}
      </div>

      {!disputing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={confirm} disabled={loading}
            style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? '…' : '✅ Oui, le trajet a eu lieu'}
          </button>
          <button onClick={() => setDisputing(true)} disabled={loading}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid rgba(239,68,68,.3)', background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            ❌ Non
          </button>
        </div>
      ) : (
        <div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="Que s'est-il passé ? (annulation, non-présentation…)"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid rgba(239,68,68,.3)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', marginBottom: 8, outline: 'none' }}/>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setDisputing(false); setReason('') }}
              style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#555' }}>
              Retour
            </button>
            <button onClick={dispute} disabled={loading}
              style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? '…' : '⚠️ Signaler un problème'}
            </button>
          </div>
        </div>
      )}

      {error   && <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, marginTop: 10 }}>⚠️ {error}</div>}
      {message && <div style={{ background: '#E8F7F4', color: '#1A9E8A', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginTop: 10 }}>{message}</div>}
    </div>
  )
}
