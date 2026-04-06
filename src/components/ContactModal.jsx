import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../utils/api'

export default function ContactModal({ trip, onClose }) {
  const navigate   = useNavigate()
  const textRef    = useRef(null)
  const [message,  setMessage]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')

  // Focus automatique + fermeture Escape
  useEffect(() => {
    textRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSend = async () => {
    if (!message.trim()) { setError('Écrivez un message avant d\'envoyer.'); return }
    setSending(true)
    setError('')
    try {
      const res  = await fetch(`${API_URL}/api/trips/${trip.id}/contact`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        // Ouvrir la conversation directement
        navigate(`/messages?booking=${data.bookingId}`)
        onClose()
      } else {
        setError(data.message || 'Erreur lors de l\'envoi.')
      }
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend()
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(3px)',
          animation: 'fadeIn .18s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,.22)',
          animation: 'slideUp .22s ease both',
          pointerEvents: 'all',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflow: 'hidden',
        }}>

          {/* ── Header ── */}
          <div style={{
            background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
            padding: '18px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                CONTACTER LE CONDUCTEUR
              </div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>
                {trip.from} → {trip.to}
              </div>
              <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, marginTop: 2 }}>
                avec {trip.driverName || trip.driverFirstName}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,.2)', border: 'none',
                borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: 16, flexShrink: 0,
              }}>
              ✕
            </button>
          </div>

          {/* ── Corps ── */}
          <div style={{ padding: '20px 22px 22px' }}>

            {/* Info trajet */}
            <div style={{
              background: '#F7F5F2', borderRadius: 12, padding: '12px 14px',
              marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: trip.driverColor || '#1A9E8A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
              }}>
                {trip.driverAvatar || (trip.driverFirstName?.[0]?.toUpperCase())}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>
                  {trip.driverName || trip.driverFirstName}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  {trip.driverRating ? `⭐ ${trip.driverRating}/5` : ''} · {trip.driverReviews || 0} avis
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1A9E8A' }}>
                  {typeof trip.price === 'number'
                    ? new Intl.NumberFormat('fr-FR').format(trip.price) + ' FCFA'
                    : trip.price}
                </div>
                <div style={{ fontSize: 10, color: '#bbb', marginTop: 1 }}>/ place</div>
              </div>
            </div>

            {/* Zone de message */}
            <div style={{ marginBottom: 6 }}>
              <label style={{
                fontSize: 11, fontWeight: 800, color: '#999',
                textTransform: 'uppercase', letterSpacing: '.06em',
                display: 'block', marginBottom: 8,
              }}>
                Votre message
              </label>
              <textarea
                ref={textRef}
                value={message}
                onChange={e => { setMessage(e.target.value); setError('') }}
                onKeyDown={handleKey}
                placeholder={`Bonjour, je souhaite réserver une place sur votre trajet ${trip.from} → ${trip.to}. Est-ce encore disponible ?`}
                rows={4}
                maxLength={1000}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px',
                  border: `1.5px solid ${error ? '#EF4444' : 'rgba(0,0,0,.12)'}`,
                  borderRadius: 12, fontSize: 14, fontWeight: 500,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: '#1A1A1A', resize: 'vertical', minHeight: 100,
                  outline: 'none', lineHeight: 1.65, transition: 'border-color .18s',
                }}
                onFocus={e => e.target.style.borderColor = '#1A9E8A'}
                onBlur={e => e.target.style.borderColor = error ? '#EF4444' : 'rgba(0,0,0,.12)'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                {error
                  ? <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>⚠ {error}</span>
                  : <span style={{ fontSize: 11, color: '#bbb' }}>Ctrl+Entrée pour envoyer</span>
                }
                <span style={{ fontSize: 11, color: message.length > 900 ? '#EF4444' : '#bbb' }}>
                  {message.length}/1000
                </span>
              </div>
            </div>

            {/* Suggestions rapides */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                Suggestions
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  `Bonjour, est-ce que la place est encore disponible ?`,
                  `À quelle heure et où exactement est le départ ?`,
                  `Pouvez-vous passer me prendre en chemin ?`,
                ].map((s, i) => (
                  <button key={i} type="button"
                    onClick={() => setMessage(s)}
                    style={{
                      background: '#F7F5F2', border: '1px solid rgba(0,0,0,.08)',
                      borderRadius: 8, padding: '5px 10px', fontSize: 11,
                      fontWeight: 600, color: '#555', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all .15s', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.target.style.background = '#E8F7F4'; e.target.style.color = '#1A9E8A' }}
                    onMouseLeave={e => { e.target.style.background = '#F7F5F2'; e.target.style.color = '#555' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,.12)', background: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', color: '#555', transition: 'all .18s',
                }}>
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                style={{
                  flex: 2, padding: '12px', borderRadius: 12,
                  background: sending || !message.trim() ? '#ccc' : 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 800,
                  cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'all .18s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {sending
                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .6s linear infinite' }}/> Envoi…</>
                  : '💬 Envoyer le message'
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}
