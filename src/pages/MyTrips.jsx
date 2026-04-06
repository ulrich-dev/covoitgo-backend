import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/api'
import { fmtFCFA } from '../data/cameroun'
import ReviewModal from '../components/ReviewModal'
import ConfirmTripPanel from '../components/ConfirmTripPanel'

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}
const fmtTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
}
const isUpcoming = (iso) => !!iso && new Date(iso) > new Date()

const TRIP_STATUS = {
  active:    { label: 'Actif',    color: '#1A9E8A', bg: '#E8F7F4' },
  full:      { label: 'Complet',  color: '#F59E0B', bg: '#FFFBEB' },
  cancelled: { label: 'Annulé',   color: '#EF4444', bg: '#FEF2F2' },
  completed: { label: 'Terminé',  color: '#6B7280', bg: '#F9FAFB' },
}
const BOOKING_STATUS = {
  pending:   { label: 'En attente', color: '#F59E0B', bg: '#FFFBEB', icon: '⏳' },
  confirmed: { label: 'Confirmée',  color: '#1A9E8A', bg: '#E8F7F4', icon: '✅' },
  cancelled: { label: 'Annulée',   color: '#EF4444', bg: '#FEF2F2', icon: '❌' },
  completed: { label: 'Terminée',  color: '#6B7280', bg: '#F9FAFB', icon: '🏁' },
}

// ══════════════════════════════════════════════════════════════
//  Modal édition trajet
// ══════════════════════════════════════════════════════════════
function EditTripModal({ trip, onClose, onSaved }) {
  const [form, setForm] = useState({
    originAddress:      trip.fromAddress || '',
    destinationAddress: trip.toAddress   || '',
    pricePerSeat:       trip.price       || '',
    departureAt:        trip.departureAt
      ? new Date(trip.departureAt).toISOString().slice(0, 16)
      : '',
    description: trip.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const res  = await fetch(`${API_URL}/api/trips/${trip.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAddress:      form.originAddress,
          destinationAddress: form.destinationAddress,
          pricePerSeat:       parseFloat(form.pricePerSeat),
          departureAt:        form.departureAt
            ? new Date(form.departureAt).toISOString()
            : undefined,
          description: form.description,
        }),
      })
      const data = await res.json()
      if (data.success) onSaved()
      else setError(data.message)
    } catch { setError('Erreur serveur.') }
    finally { setSaving(false) }
  }

  const inp = (key, label, type = 'text', extra = {}) => (
    <div key={key}>
      <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input type={type} value={form[key]} {...extra}
        onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
    </div>
  )

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 20, padding: '28px', width: '100%', maxWidth: 460, zIndex: 1001, boxShadow: '0 24px 64px rgba(0,0,0,.2)', fontFamily: "'Plus Jakarta Sans',sans-serif", maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>Modifier le trajet</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ background: '#F7F5F2', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, fontWeight: 700, color: '#1A9E8A' }}>
          {trip.from} → {trip.to}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {inp('departureAt',       'Date & heure de départ', 'datetime-local', { min: new Date().toISOString().slice(0,16) })}
          {inp('pricePerSeat',      'Prix par place (FCFA)',  'number',         { min: '500', step: '100' })}
          {inp('originAddress',     'Point de départ précis', 'text',           { placeholder: 'Ex: Gare routière, Carrefour...' })}
          {inp('destinationAddress','Point d\'arrivée précis','text',           { placeholder: 'Ex: Centre-ville, Marché...' })}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
              Message pour les passagers
            </label>
            <textarea value={form.description}
              onChange={e => setForm(v => ({ ...v, description: e.target.value }))} rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
          </div>
        </div>
        {error && <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 9, padding: '9px 12px', fontSize: 13, fontWeight: 600, marginTop: 14 }}>⚠️ {error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,.1)', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#555' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            {saving ? '…' : '✅ Enregistrer'}
          </button>
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════
//  TripCard — trajet publié par le conducteur (avec ou sans réservation)
// ══════════════════════════════════════════════════════════════
function TripCard({ item, onEdit, onReload }) {
  const { trip, stats, bookings, tripStatus, unreadCount } = item
  const upcoming = isUpcoming(trip.departureAt)
  const ts = TRIP_STATUS[tripStatus] || TRIP_STATUS.active
  const [updatingId, setUpdatingId] = useState(null)

  const handleBookingStatus = async (bookingId, status) => {
    setUpdatingId(bookingId)
    try {
      const res  = await fetch(`${API_URL}/api/trips/bookings/${bookingId}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) onReload()
    } catch {}
    finally { setUpdatingId(null) }
  }

  const cancelTrip = async () => {
    if (!confirm('Annuler ce trajet ? Les passagers seront prévenus.')) return
    try {
      await fetch(`${API_URL}/api/trips/${trip.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      onReload()
    } catch {}
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(0,0,0,.08)', boxShadow: '0 2px 12px rgba(0,0,0,.05)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: tripStatus === 'cancelled'
          ? 'linear-gradient(135deg,#9CA3AF,#6B7280)'
          : 'linear-gradient(135deg,#FF6B35,#FF8C5A)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>
            🚗 Mon trajet publié
          </div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>
            {trip.from} → {trip.to}
          </div>
          <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, marginTop: 3 }}>
            {fmtDate(trip.departureAt)} · {fmtTime(trip.departureAt)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <span style={{ background: ts.bg, color: ts.color, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
            {ts.label}
          </span>
          {unreadCount > 0 && (
            <span style={{ background: '#FF6B35', color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 800 }}>
              {unreadCount} msg non lu{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Infos trajet ── */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { icon: '💺', label: 'Places totales',   value: trip.totalSeats },
            { icon: '✅', label: 'Restantes',         value: trip.remainingSeats ?? trip.totalSeats },
            { icon: '💰', label: 'Prix/place',        value: fmtFCFA(trip.price) },
            { icon: '👥', label: 'Confirmés',         value: stats.confirmedCount },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#1A1A1A' }}>{value}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
        {trip.fromAddress && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280', display: 'flex', gap: 6 }}>
            <span>📍</span><span>{trip.fromAddress}</span>
          </div>
        )}
      </div>

      {/* ── Passagers ── */}
      <div style={{ padding: '14px 18px' }}>

        {/* Demandes en attente */}
        {bookings.filter(b => b.bookingStatus === 'pending').length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              ⏳ Demandes en attente ({bookings.filter(b => b.bookingStatus === 'pending').length})
            </div>
            {bookings.filter(b => b.bookingStatus === 'pending').map(b => (
              <div key={b.bookingId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FFFBEB', borderRadius: 10, marginBottom: 6, border: '1px solid rgba(245,158,11,.2)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.passenger.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {b.passenger.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>{b.passenger.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{b.seatsBooked} place{b.seatsBooked > 1 ? 's' : ''} · {fmtDate(b.bookingDate)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Link to={`/messages?booking=${b.bookingId}`} style={{ textDecoration: 'none' }}>
                    <button style={{ background: b.unreadCount > 0 ? '#1A9E8A' : '#F1F5F9', color: b.unreadCount > 0 ? '#fff' : '#555', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      💬{b.unreadCount > 0 ? ` (${b.unreadCount})` : ''}
                    </button>
                  </Link>
                  {upcoming && (
                    <>
                      <button disabled={updatingId === b.bookingId}
                        onClick={() => handleBookingStatus(b.bookingId, 'confirmed')}
                        style={{ background: '#1A9E8A', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✅ Accepter
                      </button>
                      <button disabled={updatingId === b.bookingId}
                        onClick={() => handleBookingStatus(b.bookingId, 'cancelled')}
                        style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Refuser
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passagers confirmés */}
        {bookings.filter(b => b.bookingStatus === 'confirmed').length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1A9E8A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              ✅ Passagers confirmés ({bookings.filter(b => b.bookingStatus === 'confirmed').length})
            </div>
            {bookings.filter(b => b.bookingStatus === 'confirmed').map(b => (
              <div key={b.bookingId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#E8F7F4', borderRadius: 10, marginBottom: b.needsConfirm ? 6 : 6, border: '1px solid rgba(26,158,138,.2)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.passenger.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {b.passenger.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>{b.passenger.name}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#888' }}>{b.seatsBooked} place{b.seatsBooked > 1 ? 's' : ''}</span>
                      {b.passenger.phone && (
                        <a href={`tel:${b.passenger.phone}`} style={{ fontSize: 11, color: '#1A9E8A', fontWeight: 700, textDecoration: 'none' }}>📞 {b.passenger.phone}</a>
                      )}
                    </div>
                  </div>
                  <Link to={`/messages?booking=${b.bookingId}`} style={{ textDecoration: 'none' }}>
                    <button style={{ background: b.unreadCount > 0 ? '#1A9E8A' : '#F1F5F9', color: b.unreadCount > 0 ? '#fff' : '#555', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      💬{b.unreadCount > 0 ? ` (${b.unreadCount})` : ''}
                    </button>
                  </Link>
                </div>
                {/* Panel confirmation si trajet passé */}
                {!upcoming && (
                  <div style={{ marginBottom: 10, paddingLeft: 4 }}>
                    <ConfirmTripPanel
                      bookingId={b.bookingId}
                      isDriver={true}
                      driverConfirmed={b.driverConfirmed || false}
                      passengerConfirmed={b.passengerConfirmed || false}
                      onUpdated={onReload}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Aucun passager */}
        {bookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#bbb', fontSize: 13, fontWeight: 600 }}>
            Aucune réservation pour l'instant
          </div>
        )}

        {/* Actions trajet */}
        {upcoming && tripStatus !== 'cancelled' && (
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #F1F5F9', marginTop: 6 }}>
            <button onClick={() => onEdit(trip)}
              style={{ background: '#F7F5F2', border: '1.5px solid rgba(0,0,0,.1)', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#555' }}>
              ✏️ Modifier
            </button>
            <button onClick={cancelTrip}
              style={{ background: 'none', border: '1.5px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#EF4444', marginLeft: 'auto' }}>
              ❌ Annuler le trajet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  BookingCard — réservation en tant que passager
// ══════════════════════════════════════════════════════════════
function BookingCard({ booking, onStatusChange, onReview, onReload }) {
  const [updating, setUpdating] = useState(false)
  const upcoming = isUpcoming(booking.trip.departureAt)
  const st       = BOOKING_STATUS[booking.bookingStatus] || BOOKING_STATUS.pending

  const handleStatus = async (status) => {
    setUpdating(true)
    try {
      const res  = await fetch(`${API_URL}/api/trips/bookings/${booking.bookingId}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) onStatusChange(booking.bookingId, status)
    } catch {}
    finally { setUpdating(false) }
  }

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${booking.bookingStatus === 'confirmed' ? 'rgba(26,158,138,.3)' : 'rgba(0,0,0,.08)'}`,
      borderRadius: 16, overflow: 'hidden',
      boxShadow: booking.bookingStatus === 'confirmed' ? '0 4px 18px rgba(26,158,138,.1)' : '0 2px 8px rgba(0,0,0,.04)',
      opacity: booking.bookingStatus === 'cancelled' ? .65 : 1,
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: booking.bookingStatus === 'cancelled'
          ? 'linear-gradient(135deg,#9CA3AF,#6B7280)'
          : 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>🎫 Ma réservation</div>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>{booking.trip.from} → {booking.trip.to}</div>
          <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, marginTop: 2 }}>
            {fmtDate(booking.trip.departureAt)} · {fmtTime(booking.trip.departureAt)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}33`, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
            {st.icon} {st.label}
          </span>
          {booking.unreadCount > 0 && (
            <span style={{ background: '#FF6B35', color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 800 }}>
              {booking.unreadCount} nouveau{booking.unreadCount > 1 ? 'x' : ''} msg
            </span>
          )}
        </div>
      </div>

      {/* Corps */}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Conducteur */}
          <div style={{ background: '#F7F5F2', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Conducteur</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: booking.other.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {booking.other.avatar}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>{booking.other.name}</div>
                {booking.other.rating > 0 && (
                  <div style={{ fontSize: 11, color: '#F59E0B' }}>
                    {'★'.repeat(Math.round(booking.other.rating))} <span style={{ color: '#bbb' }}>{booking.other.rating}/5</span>
                  </div>
                )}
                {booking.bookingStatus === 'confirmed' && booking.other.phone && (
                  <a href={`tel:${booking.other.phone}`} style={{ fontSize: 11, color: '#1A9E8A', fontWeight: 700, textDecoration: 'none' }}>
                    📞 {booking.other.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Détails */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Détails</div>
            {[
              ['Places',     booking.seatsBooked],
              ['Prix/place', fmtFCFA(booking.trip.price)],
              ['Total',      fmtFCFA(booking.trip.price * booking.seatsBooked)],
              ['Réservé le', fmtDate(booking.bookingDate)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Point de rdv si confirmé */}
        {booking.bookingStatus === 'confirmed' && (booking.trip.fromAddress || booking.trip.toAddress) && (
          <div style={{ background: '#E8F7F4', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#1A9E8A', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Point de rendez-vous</div>
            {booking.trip.fromAddress && <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>📍 {booking.trip.fromAddress}</div>}
            {booking.trip.toAddress   && <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>🏁 {booking.trip.toAddress}</div>}
          </div>
        )}

        {/* Message initial */}
        {booking.bookingMessage && (
          <div style={{ background: '#F7F5F2', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{booking.bookingMessage}"
          </div>
        )}

        {/* ── Confirmation mutuelle (trajet passé + confirmé) ── */}
        {!isUpcoming(booking.trip.departureAt) && booking.bookingStatus === 'confirmed' && (
          <div style={{ marginBottom: 14 }}>
            <ConfirmTripPanel
              bookingId={booking.bookingId}
              isDriver={false}
              driverConfirmed={booking.driverConfirmed || false}
              passengerConfirmed={booking.passengerConfirmed || false}
              onUpdated={onReload}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link to={`/messages?booking=${booking.bookingId}`} style={{ textDecoration: 'none' }}>
            <button style={{
              background: booking.unreadCount > 0 ? '#1A9E8A' : 'none',
              color: booking.unreadCount > 0 ? '#fff' : '#1A9E8A',
              border: '1.5px solid rgba(26,158,138,.4)',
              borderRadius: 10, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              💬 Messages
              {booking.unreadCount > 0 && (
                <span style={{ background: '#fff', color: '#1A9E8A', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900 }}>
                  {booking.unreadCount}
                </span>
              )}
            </button>
          </Link>

          {booking.bookingStatus === 'pending' && upcoming && (
            <button disabled={updating} onClick={() => handleStatus('cancelled')}
              style={{ background: 'none', color: '#EF4444', border: '1.5px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
              {updating ? '…' : '❌ Annuler'}
            </button>
          )}

          {!upcoming && ['confirmed', 'completed'].includes(booking.bookingStatus) && (
            <button onClick={() => onReview({ bookingId: booking.bookingId, driverName: booking.other.name, from: booking.trip.from, to: booking.trip.to })}
              style={{ background: '#FFFBEB', color: '#F59E0B', border: '1.5px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
              ⭐ Laisser un avis
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  Page principale
// ══════════════════════════════════════════════════════════════
export default function MyTrips() {
  const { t } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [urlParams]  = useSearchParams()

  const [tab,         setTab]         = useState('passenger')
  const [filter,      setFilter]      = useState('all')
  const [asPassenger, setAsPassenger] = useState([])
  const [asDriver,    setAsDriver]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [editTrip,    setEditTrip]    = useState(null)
  const [reviewData,  setReviewData]  = useState(null)

  const load = () => {
    setLoading(true)
    fetch(`${API_URL}/api/trips/my-bookings`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAsPassenger(data.asPassenger)
          setAsDriver(data.asDriver)
        } else setError(data.message)
      })
      .catch(() => setError('Impossible de charger les trajets.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (urlParams.get('review')) setTab('passenger')
    load()
  }, [user, navigate])

  const handleStatusChange = (bookingId, status) => {
    setAsPassenger(prev => prev.map(b => b.bookingId === bookingId ? { ...b, bookingStatus: status } : b))
  }

  // Filtrer les trajets conducteur
  const applyDriverFilter = (list) => {
    if (filter === 'upcoming') return list.filter(t => isUpcoming(t.trip.departureAt) && t.tripStatus !== 'cancelled')
    if (filter === 'past')     return list.filter(t => !isUpcoming(t.trip.departureAt) || t.tripStatus === 'cancelled')
    return list
  }

  // Filtrer les réservations passager
  const applyPassengerFilter = (list) => {
    if (filter === 'upcoming') return list.filter(b => isUpcoming(b.trip.departureAt) && b.bookingStatus !== 'cancelled')
    if (filter === 'past')     return list.filter(b => !isUpcoming(b.trip.departureAt) || b.bookingStatus === 'cancelled')
    return list
  }

  const driverList    = applyDriverFilter(asDriver)
  const passengerList = applyPassengerFilter(asPassenger)

  const totalUnreadDriver    = asDriver.reduce((s, t) => s + (t.unreadCount || 0), 0)
  const totalUnreadPassenger = asPassenger.reduce((s, b) => s + (b.unreadCount || 0), 0)
  const pendingCount         = asDriver.reduce((s, t) => s + (t.stats?.pendingCount || 0), 0)

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.mt-card{animation:fadeUp .3s ease both}`}</style>

      <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F7F5F2', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', padding: '32px 0 48px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8 }}>Mon espace</div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-.02em' }}>Mes trajets</h1>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14, margin: 0 }}>Vos trajets publiés et vos réservations</p>
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: '-24px auto 0', padding: '0 20px 60px' }}>

          {/* Tabs */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 6, marginBottom: 20, display: 'flex', gap: 4, boxShadow: '0 4px 18px rgba(0,0,0,.08)' }}>
            {[
              { id: 'passenger', label: '🎫 Mes réservations', count: asPassenger.length, unread: totalUnreadPassenger },
              { id: 'driver',    label: '🚗 Mes trajets publiés', count: asDriver.length, unread: totalUnreadDriver, pending: pendingCount },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: tab === t.id ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : 'transparent',
                  color: tab === t.id ? '#fff' : '#888',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all .2s',
                }}>
                {t.label}
                <span style={{ background: tab === t.id ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.08)', color: tab === t.id ? '#fff' : '#888', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 900 }}>{t.count}</span>
                {t.pending > 0 && <span style={{ background: '#FF6B35', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>{t.pending}</span>}
                {t.unread > 0  && <span style={{ background: '#EF4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 900 }}>{t.unread}</span>}
              </button>
            ))}
          </div>

          {/* Filtres */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[['all','Tous'],['upcoming','📅 À venir'],['past','🕐 Passés']].map(([id, lbl]) => (
              <button key={id} onClick={() => setFilter(id)}
                style={{ padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${filter === id ? '#1A9E8A' : 'rgba(0,0,0,.1)'}`, background: filter === id ? '#E8F7F4' : '#fff', color: filter === id ? '#1A9E8A' : '#888', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s' }}>
                {lbl}
              </button>
            ))}
            {tab === 'driver' && (
              <Link to="/publish" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                <button style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Nouveau trajet
                </button>
              </Link>
            )}
          </div>

          {/* Chargement */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
              <div style={{ fontSize: 36, display: 'inline-block', animation: 'spin 1s linear infinite' }}>🚗</div>
              <p style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>Chargement…</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {error && !loading && (
            <div style={{ background: '#fef2f2', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 14, padding: '16px 20px', color: '#dc2626', fontSize: 14, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ── Trajets conducteur ── */}
          {!loading && tab === 'driver' && (
            driverList.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🚗</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>
                  {filter === 'upcoming' ? 'Aucun trajet à venir' : filter === 'past' ? 'Aucun trajet passé' : 'Vous n\'avez pas encore publié de trajet'}
                </h2>
                <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Publiez votre premier trajet et commencez à recevoir des passagers.
                </p>
                <Link to="/publish">
                  <button style={{ background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🚗 Publier un trajet
                  </button>
                </Link>
              </div>
            ) : (
              driverList.map((item, i) => (
                <div key={item.tripId} className="mt-card" style={{ marginBottom: 16, animationDelay: `${i * .06}s` }}>
                  <TripCard item={item} onEdit={setEditTrip} onReload={load} />
                </div>
              ))
            )
          )}

          {/* ── Réservations passager ── */}
          {!loading && tab === 'passenger' && (
            passengerList.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎫</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>
                  {filter === 'upcoming' ? 'Aucune réservation à venir' : filter === 'past' ? 'Aucune réservation passée' : 'Aucune réservation'}
                </h2>
                <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>Recherchez un trajet et réservez votre place.</p>
                <Link to="/search">
                  <button style={{ background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                    🔍 Trouver un trajet
                  </button>
                </Link>
              </div>
            ) : (
              passengerList.map((booking, i) => (
                <div key={booking.bookingId} className="mt-card" style={{ marginBottom: 14, animationDelay: `${i * .06}s` }}>
                  <BookingCard booking={booking} onStatusChange={handleStatusChange} onReview={setReviewData} onReload={load} />
                </div>
              ))
            )
          )}
        </div>
      </div>

      {editTrip && (
        <EditTripModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSaved={() => { setEditTrip(null); load() }}
        />
      )}

      {reviewData && (
        <ReviewModal
          {...reviewData}
          onClose={() => setReviewData(null)}
          onSubmit={() => setReviewData(null)}
        />
      )}
    </>
  )
}
