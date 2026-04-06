import { useState, useEffect, useCallback } from 'react'
import { useAdmin } from '../../hooks/useAdmin'
import { fmtFCFA } from '../../data/cameroun'

const STATUS_MAP = {
  pending:   { label: '⏳ En attente',  color: '#D97706', bg: '#FFFBEB' },
  confirmed: { label: '✅ Confirmée',   color: '#059669', bg: '#ECFDF5' },
  cancelled: { label: '❌ Annulée',     color: '#DC2626', bg: '#FEF2F2' },
  completed: { label: '🏁 Terminée',    color: '#6B7280', bg: '#F9FAFB' },
}

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—'

export default function AdminBookings() {
  const { apiFetch, loading } = useAdmin()
  const [bookings, setBookings] = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [pages,    setPages]    = useState(1)
  const [status,   setStatus]   = useState('')

  const load = useCallback(async () => {
    const q = new URLSearchParams({ page, status, limit: 20 })
    const d = await apiFetch(`/api/admin/bookings?${q}`)
    if (d.success) { setBookings(d.bookings); setTotal(d.total); setPages(d.pages) }
  }, [page, status])

  useEffect(() => { load() }, [load])

  // Totaux par statut pour le résumé
  const summary = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0 }}>Réservations</h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: '3px 0 0' }}>{total} réservations au total</p>
      </div>

      {/* Filtres statut */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #E2E8F0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginRight: 4 }}>Statut :</span>
        {[
          { val: '',          label: 'Tous' },
          { val: 'pending',   label: '⏳ En attente' },
          { val: 'confirmed', label: '✅ Confirmées' },
          { val: 'cancelled', label: '❌ Annulées' },
          { val: 'completed', label: '🏁 Terminées' },
        ].map(f => (
          <button key={f.val} onClick={() => { setStatus(f.val); setPage(1) }}
            style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${status === f.val ? '#7C3AED' : '#E2E8F0'}`, background: status === f.val ? '#F3EEFF' : '#fff', color: status === f.val ? '#7C3AED' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Trajet', 'Conducteur', 'Passager', 'Départ', 'Montant', 'Places', 'Statut', 'Réservé le'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !bookings.length && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              )}
              {!loading && !bookings.length && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Aucune réservation trouvée</td></tr>
              )}
              {bookings.map((b, i) => {
                const s = STATUS_MAP[b.status] || STATUS_MAP.pending
                const montant = parseFloat(b.price_per_seat) * parseInt(b.seats_booked)
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{b.origin_city} → {b.destination_city}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{fmtDateTime(b.departure_at)}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{b.driver_first} {b.driver_last}</span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{b.pax_first} {b.pax_last}</span>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDateTime(b.departure_at)}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1A9E8A', whiteSpace: 'nowrap' }}>
                      {fmtFCFA(montant)}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#374151', textAlign: 'center' }}>
                      {b.seats_booked}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.bg, color: s.color, borderRadius: 7, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDate(b.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Page {page} / {pages} — {total} résultats</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'inherit' }}>← Préc.</button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: page === pages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'inherit' }}>Suiv. →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
