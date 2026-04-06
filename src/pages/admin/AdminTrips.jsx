import { useState, useEffect, useCallback } from 'react'
import { useAdmin } from '../../hooks/useAdmin'
import { fmtFCFA } from '../../data/cameroun'

const TRIP_STATUS = {
  active:    { label: '✅ Actif',      color: '#059669', bg: '#ECFDF5' },
  full:      { label: '🔴 Complet',    color: '#DC2626', bg: '#FEF2F2' },
  cancelled: { label: '❌ Annulé',     color: '#9CA3AF', bg: '#F9FAFB' },
  completed: { label: '🏁 Terminé',    color: '#6B7280', bg: '#F9FAFB' },
}

function StatusBadge({ status }) {
  const s = TRIP_STATUS[status] || { label: status, color: '#64748B', bg: '#F1F5F9' }
  return <span style={{ background: s.bg, color: s.color, borderRadius: 7, padding: '3px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{s.label}</span>
}

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—'

export default function AdminTrips() {
  const { apiFetch, loading } = useAdmin()
  const [trips,   setTrips]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [pages,   setPages]   = useState(1)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    const q = new URLSearchParams({ search, page, status, limit: 20 })
    const d = await apiFetch(`/api/admin/trips?${q}`)
    if (d.success) { setTrips(d.trips); setTotal(d.total); setPages(d.pages) }
  }, [search, page, status])

  useEffect(() => { load() }, [load])

  const changeStatus = async (id, newStatus) => {
    const d = await apiFetch(`/api/admin/trips/${id}/status`, { method: 'PATCH', body: { status: newStatus } })
    if (d.success) setTrips(ts => ts.map(t => t.id === id ? { ...t, status: newStatus } : t))
    setConfirm(null)
  }

  const del = async (id) => {
    const d = await apiFetch(`/api/admin/trips/${id}`, { method: 'DELETE' })
    if (d.success) setTrips(ts => ts.filter(t => t.id !== id))
    setConfirm(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0 }}>Trajets</h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: '3px 0 0' }}>{total} trajets au total</p>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #E2E8F0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: .4 }}>🔍</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Ville, conducteur…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0F172A' }}/>
        </div>
        {[
          { val: '',          label: 'Tous' },
          { val: 'active',    label: '✅ Actifs' },
          { val: 'full',      label: '🔴 Complets' },
          { val: 'completed', label: '🏁 Terminés' },
          { val: 'cancelled', label: '❌ Annulés' },
        ].map(f => (
          <button key={f.val} onClick={() => { setStatus(f.val); setPage(1) }}
            style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${status === f.val ? '#FF6B35' : '#E2E8F0'}`, background: status === f.val ? '#FFF2EB' : '#fff', color: status === f.val ? '#FF6B35' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                {['Trajet', 'Conducteur', 'Départ', 'Prix', 'Places', 'Réservations', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !trips.length && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              )}
              {!loading && !trips.length && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Aucun trajet trouvé</td></tr>
              )}
              {trips.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>

                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{t.origin_city} → {t.destination_city}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>ID: {t.id.slice(0,8)}…</div>
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#374151' }}>{t.driver_first} {t.driver_last}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.driver_email}</div>
                  </td>

                  <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(t.departure_at)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1A9E8A', whiteSpace: 'nowrap' }}>{fmtFCFA(parseFloat(t.price_per_seat))}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>{t.available_seats}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7C3AED' }}>{parseInt(t.bookings_count) || 0}</td>

                  <td style={{ padding: '12px 16px' }}><StatusBadge status={t.status}/></td>

                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {t.status === 'active' && (
                        <button onClick={() => setConfirm({ id: t.id, action: 'cancel', label: `${t.origin_city} → ${t.destination_city}` })}
                          style={{ background: '#FEF9C3', color: '#B45309', border: '1px solid rgba(180,83,9,.2)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Annuler
                        </button>
                      )}
                      <button onClick={() => setConfirm({ id: t.id, action: 'delete', label: `${t.origin_city} → ${t.destination_city}` })}
                        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid rgba(220,38,38,.2)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

      {/* Modal confirmation */}
      {confirm && (
        <>
          <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }}/>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 16, padding: '28px', width: 340, zIndex: 201, boxShadow: '0 20px 60px rgba(0,0,0,.2)', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>{confirm.action === 'delete' ? '🗑️' : '❌'}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 6 }}>
              {confirm.action === 'delete' ? 'Supprimer ce trajet ?' : 'Annuler ce trajet ?'}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 22 }}>{confirm.label}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', color: '#64748B' }}>Annuler</button>
              <button
                onClick={() => confirm.action === 'delete' ? del(confirm.id) : changeStatus(confirm.id, 'cancelled')}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>Confirmer</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
