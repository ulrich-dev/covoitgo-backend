import { useState, useEffect, useCallback } from 'react'
import { useAdmin } from '../../hooks/useAdmin'

const ROLE_LABELS = { both: '🔄 Les deux', driver: '🚗 Conducteur', passenger: '🎫 Passager' }

function Avatar({ name, color, size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color || '#1A9E8A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!value)} disabled={disabled}
      style={{ width: 40, height: 22, borderRadius: 11, background: value ? '#1A9E8A' : '#CBD5E1', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0, opacity: disabled ? .5 : 1 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
    </button>
  )
}

export default function AdminUsers() {
  const { apiFetch, loading } = useAdmin()
  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [pages,   setPages]   = useState(1)
  const [search,  setSearch]  = useState('')
  const [status,  setStatus]  = useState('')
  const [confirm, setConfirm] = useState(null) // { id, action }
  const [updating,setUpdating]= useState({})

  const load = useCallback(async () => {
    const q = new URLSearchParams({ search, page, status, limit: 20 })
    const d = await apiFetch(`/api/admin/users?${q}`)
    if (d.success) { setUsers(d.users); setTotal(d.total); setPages(d.pages) }
  }, [search, page, status])

  useEffect(() => { load() }, [load])

  const patch = async (id, body, _label) => {
    setUpdating(u => ({ ...u, [id]: true }))
    // docs_status a sa propre route
    const endpoint = body.docs_status !== undefined
      ? `/api/admin/users/${id}/docs`
      : `/api/admin/users/${id}`
    const d = await apiFetch(endpoint, { method: 'PATCH', body })
    if (d.success) {
      setUsers(us => us.map(u => u.id === id ? { ...u, ...d.user } : u))
    }
    setUpdating(u => ({ ...u, [id]: false }))
    setConfirm(null)
  }

  const del = async (id) => {
    const d = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (d.success) setUsers(us => us.filter(u => u.id !== id))
    setConfirm(null)
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0 }}>Utilisateurs</h1>
          <p style={{ color: '#64748B', fontSize: 13, margin: '3px 0 0' }}>{total} membres au total</p>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', border: '1px solid #E2E8F0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: .4 }}>🔍</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Nom, email…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#0F172A' }}/>
        </div>
        {[
          { val: '',         label: 'Tous' },
          { val: 'active',   label: '✅ Actifs' },
          { val: 'inactive', label: '❌ Inactifs' },
          { val: 'admin',    label: '🛡️ Admins' },
        ].map(f => (
          <button key={f.val} onClick={() => { setStatus(f.val); setPage(1) }}
            style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${status === f.val ? '#1A9E8A' : '#E2E8F0'}`, background: status === f.val ? '#E8F7F4' : '#fff', color: status === f.val ? '#1A9E8A' : '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                {['Utilisateur', 'Rôle', 'Trajets', 'Réservations', 'Inscrit le', 'Actif', 'Admin', 'Documents', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && !users.length && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>
              )}
              {!loading && !users.length && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Aucun utilisateur trouvé</td></tr>
              )}
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC', opacity: u.is_active ? 1 : .6 }}>

                  {/* Utilisateur */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.first_name} color={u.avatar_color}/>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          {u.first_name} {u.last_name}
                          {u.is_admin && <span style={{ marginLeft: 6, background: '#FEF9C3', color: '#B45309', borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>ADMIN</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{u.email}</div>
                        {u.phone && <div style={{ fontSize: 11, color: '#94A3B8' }}>📞 {u.phone}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Rôle */}
                  <td style={{ padding: '12px 16px' }}>
                    <select value={u.role}
                      onChange={e => patch(u.id, { role: e.target.value })}
                      style={{ border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: '#fff' }}>
                      <option value="both">🔄 Les deux</option>
                      <option value="driver">🚗 Conducteur</option>
                      <option value="passenger">🎫 Passager</option>
                    </select>
                  </td>

                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#FF6B35' }}>{parseInt(u.trips_count) || 0}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7C3AED' }}>{parseInt(u.bookings_count) || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>

                  {/* Toggle actif */}
                  <td style={{ padding: '12px 16px' }}>
                    <Toggle value={u.is_active} disabled={!!updating[u.id]}
                      onChange={v => patch(u.id, { is_active: v })}/>
                  </td>

                  {/* Toggle admin */}
                  <td style={{ padding: '12px 16px' }}>
                    <Toggle value={u.is_admin} disabled={!!updating[u.id]}
                      onChange={v => setConfirm({ id: u.id, action: 'admin', value: v, name: `${u.first_name} ${u.last_name}` })}/>
                  </td>

                  {/* Bouton actions */}
                  <td style={{ padding: '12px 16px' }}>
                    {/* Documents */}
                    {u.docs_status === 'none' && <span style={{ color:'#CBD5E1', fontSize:11, fontWeight:700 }}>—</span>}
                    {u.docs_status === 'pending' && (
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={() => patch(u.id, { docs_status:'verified' }, 'docs')}
                          style={{ background:'#ECFDF5', color:'#059669', border:'1px solid rgba(5,150,105,.2)', borderRadius:7, padding:'4px 9px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          ✅ Vérifier
                        </button>
                        <button onClick={() => patch(u.id, { docs_status:'rejected' }, 'docs')}
                          style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid rgba(220,38,38,.2)', borderRadius:7, padding:'4px 9px', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          ❌ Rejeter
                        </button>
                      </div>
                    )}
                    {u.docs_status === 'verified' && <span style={{ background:'#ECFDF5', color:'#059669', borderRadius:7, padding:'3px 9px', fontSize:11, fontWeight:800 }}>✅ Vérifiés</span>}
                    {u.docs_status === 'rejected' && <span style={{ background:'#FEF2F2', color:'#DC2626', borderRadius:7, padding:'3px 9px', fontSize:11, fontWeight:800 }}>❌ Rejetés</span>}
                  </td>

                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => setConfirm({ id: u.id, action: 'delete', name: `${u.first_name} ${u.last_name}` })}
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid rgba(220,38,38,.2)', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Page {page} / {pages} — {total} résultats</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: page === 1 ? '#F8FAFC' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'inherit' }}>← Préc.</button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: page === pages ? '#F8FAFC' : '#fff', cursor: page === pages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'inherit' }}>Suiv. →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal confirmation */}
      {confirm && (
        <>
          <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }}/>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 16, padding: '28px', width: 360, zIndex: 201, boxShadow: '0 20px 60px rgba(0,0,0,.2)', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>
              {confirm.action === 'delete' ? '🗑️' : '🛡️'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
              {confirm.action === 'delete' ? 'Supprimer cet utilisateur ?' : confirm.value ? 'Promouvoir en admin ?' : 'Retirer les droits admin ?'}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 22 }}>
              {confirm.name}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', color: '#64748B' }}>
                Annuler
              </button>
              <button
                onClick={() => confirm.action === 'delete' ? del(confirm.id) : patch(confirm.id, { is_admin: confirm.value })}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: confirm.action === 'delete' ? '#DC2626' : '#1A9E8A', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' }}>
                Confirmer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
