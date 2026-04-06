import { useState, useEffect, useCallback } from 'react'
import { useAdmin } from '../../hooks/useAdmin'
import { fmtFCFA } from '../../data/cameroun'

const METHOD_LABELS = {
  mtn_momo:     { label: 'MTN MoMo',     icon: '🟡' },
  orange_money: { label: 'Orange Money', icon: '🟠' },
  bank:         { label: 'Virement',     icon: '🏦' },
  cash:         { label: 'Espèces',      icon: '💵' },
}

const STATUS_REQ = {
  pending:   { label: '⏳ En attente',  color: '#F59E0B', bg: '#FFFBEB' },
  confirmed: { label: '✅ Confirmé',    color: '#1A9E8A', bg: '#E8F7F4' },
  rejected:  { label: '❌ Rejeté',      color: '#EF4444', bg: '#FEF2F2' },
}

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AdminDebtors() {
  const { apiFetch } = useAdmin()
  const [tab,      setTab]      = useState('debtors')   // 'debtors' | 'requests' | 'report'
  const [debtors,  setDebtors]  = useState([])
  const [requests, setRequests] = useState([])
  const [report,   setReport]   = useState(null)
  const [totalDue, setTotalDue] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [noteId,   setNoteId]   = useState(null)
  const [note,     setNote]     = useState('')

  const loadDebtors = useCallback(async () => {
    setLoading(true)
    const d = await apiFetch('/api/freemium/admin/debtors')
    if (d.success) { setDebtors(d.debtors); setTotalDue(d.totalDue) }
    setLoading(false)
  }, [])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    const d = await apiFetch('/api/freemium/admin/payment-requests?status=all')
    if (d.success) setRequests(d.requests)
    setLoading(false)
  }, [])

  const loadReport = useCallback(async () => {
    setLoading(true)
    const d = await apiFetch('/api/freemium/admin/report')
    if (d.success) setReport(d.report)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'debtors')  loadDebtors()
    if (tab === 'requests') loadRequests()
    if (tab === 'report')   loadReport()
  }, [tab])

  const handleRequest = async (id, status) => {
    const d = await apiFetch(`/api/freemium/admin/payment-requests/${id}`, {
      method: 'PATCH', body: { status, note },
    })
    if (d.success) {
      setRequests(rs => rs.map(r => r.id === id ? { ...r, status } : r))
      if (status === 'confirmed') {
        setDebtors(ds => ds.map(d =>
          d.req_id === id ? { ...d, balance_due: 0, payment_blocked: false } : d
        ))
      }
      setNoteId(null); setNote('')
    }
  }

  const unblock = async (userId) => {
    const d = await apiFetch(`/api/freemium/admin/unblock/${userId}`, { method: 'PATCH', body: {} })
    if (d.success) setDebtors(ds => ds.filter(d => d.id !== userId))
  }

  const pending = requests.filter(r => r.status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: 0 }}>Gestion des paiements</h1>
          <p style={{ color: '#64748B', fontSize: 13, margin: '3px 0 0' }}>
            Commission 10% · 10 trajets gratuits · {fmtFCFA(totalDue)} en attente
          </p>
        </div>
        {pending > 0 && (
          <div style={{ background: '#FEF2F2', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
            🔔 {pending} demande{pending > 1 ? 's' : ''} en attente
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 12, padding: 4 }}>
        {[
          { id: 'debtors',  label: `💰 Débiteurs (${debtors.length})` },
          { id: 'requests', label: `📋 Demandes${pending > 0 ? ` (${pending})` : ''}` },
          { id: 'report',   label: '📊 Rapport' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '10px', borderRadius: 9, border: 'none', background: tab === t.id ? '#fff' : 'transparent', color: tab === t.id ? '#0F172A' : '#64748B', fontSize: 13, fontWeight: tab === t.id ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,.08)' : 'none', transition: 'all .18s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ DÉBITEURS ══ */}
      {tab === 'debtors' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Conducteur', 'Trajets', 'Gratuits restants', 'Dû', 'Statut', 'Dernière demande', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</td></tr>}
              {!loading && !debtors.length && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Aucun débiteur 🎉</td></tr>}
              {debtors.map((d, i) => {
                const reqSt = d.req_status ? STATUS_REQ[d.req_status] : null
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: d.avatar_color || '#1A9E8A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
                          {d.first_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1A1A1A' }}>{d.first_name} {d.last_name}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{d.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>{d.trips_published || 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: (d.free_trips_left || 0) > 0 ? '#E8F7F4' : '#FEF2F2', color: (d.free_trips_left || 0) > 0 ? '#1A9E8A' : '#EF4444', borderRadius: 8, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
                        {d.free_trips_left || 0} / 10
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 900, color: '#EF4444', fontSize: 15 }}>
                      {fmtFCFA(parseFloat(d.balance_due))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {d.payment_blocked
                        ? <span style={{ background: '#FEF2F2', color: '#EF4444', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>🔒 Bloqué</span>
                        : <span style={{ background: '#FFFBEB', color: '#F59E0B', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>⚠️ Doit</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {reqSt ? (
                        <div>
                          <span style={{ background: reqSt.bg, color: reqSt.color, borderRadius: 7, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{reqSt.label}</span>
                          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                            {METHOD_LABELS[d.req_method]?.icon} {fmtDate(d.req_created_at)}
                          </div>
                          {d.req_ref && <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>Réf: {d.req_ref}</div>}
                        </div>
                      ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>Aucune demande</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {d.payment_blocked && (
                          <button onClick={() => unblock(d.id)}
                            style={{ background: '#E8F7F4', color: '#1A9E8A', border: '1px solid rgba(26,158,138,.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            🔓 Débloquer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ DEMANDES DE PAIEMENT ══ */}
      {tab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Chargement…</div>}
          {!loading && !requests.length && (
            <div style={{ background: '#fff', borderRadius: 14, padding: 48, textAlign: 'center', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Aucune demande</div>
            </div>
          )}
          {requests.map(r => {
            const st  = STATUS_REQ[r.status] || STATUS_REQ.pending
            const met = METHOD_LABELS[r.method] || { label: r.method, icon: '💳' }
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${r.status === 'pending' ? 'rgba(245,158,11,.3)' : '#E2E8F0'}`, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: r.avatar_color || '#1A9E8A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                      {r.first_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1A1A' }}>{r.first_name} {r.last_name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{r.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#1A9E8A' }}>{fmtFCFA(parseFloat(r.amount))}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(r.created_at)}</div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                </div>

                {/* Détails */}
                <div style={{ display: 'flex', gap: 16, marginTop: 14, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, flexWrap: 'wrap' }}>
                  <div><span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Méthode</span><br/><span style={{ fontSize: 13, fontWeight: 700 }}>{met.icon} {met.label}</span></div>
                  {r.phone && <div><span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Téléphone</span><br/><span style={{ fontSize: 13, fontWeight: 700 }}>{r.phone}</span></div>}
                  {r.reference && <div><span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Référence</span><br/><span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{r.reference}</span></div>}
                  <div><span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Compte débiteur</span><br/><span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{fmtFCFA(parseFloat(r.balance_due))}</span></div>
                </div>

                {/* Actions */}
                {r.status === 'pending' && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {noteId === r.id ? (
                      <>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optionnel)…"
                          rows={2} style={{ flex: 1, padding: '9px 12px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 9, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none' }}/>
                        <button onClick={() => handleRequest(r.id, 'confirmed')}
                          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#1A9E8A', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                          ✅ Confirmer
                        </button>
                        <button onClick={() => handleRequest(r.id, 'rejected')}
                          style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid rgba(239,68,68,.3)', background: '#FEF2F2', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          ❌ Rejeter
                        </button>
                        <button onClick={() => { setNoteId(null); setNote('') }}
                          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', background: '#fff', color: '#888', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setNoteId(r.id)}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Traiter cette demande →
                      </button>
                    )}
                  </div>
                )}
                {r.note && <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280', background: '#F8FAFC', borderRadius: 8, padding: '8px 12px', fontStyle: 'italic' }}>Note admin : {r.note}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* ══ RAPPORT ══ */}
      {tab === 'report' && report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
            {[
              { icon:'💰', label:'Total dû',          value: fmtFCFA(parseFloat(report.summary.total_due)), color:'#EF4444', bg:'#FEF2F2' },
              { icon:'🔒', label:'Comptes bloqués',    value: parseInt(report.summary.blocked_count), color:'#F59E0B', bg:'#FFFBEB' },
              { icon:'👥', label:'Débiteurs',          value: parseInt(report.summary.debtors_count), color:'#7C3AED', bg:'#F3EEFF' },
              { icon:'🚗', label:'En zone payante',    value: parseInt(report.summary.paid_zone_count), color:'#1A9E8A', bg:'#E8F7F4' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '18px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginTop: 3 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Historique mensuel */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 16px' }}>Paiements confirmés par mois</h3>
            {!report.monthly.length ? (
              <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun paiement pour l'instant</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    {['Mois', 'Paiements confirmés', 'Montant reçu'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.monthly.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                        {new Date(m.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1A9E8A' }}>{m.confirmed}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: '#1A9E8A' }}>{fmtFCFA(parseFloat(m.amount_confirmed))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Info modèle */}
          <div style={{ background: '#E8F7F4', border: '1.5px solid rgba(26,158,138,.2)', borderRadius: 14, padding: '18px 22px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1A9E8A', margin: '0 0 10px' }}>Modèle économique</h3>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#1A1A1A' }}>
              <div><span style={{ fontWeight: 700 }}>Trajets gratuits :</span> 10 par conducteur</div>
              <div><span style={{ fontWeight: 700 }}>Commission :</span> 10% du total du trajet</div>
              <div><span style={{ fontWeight: 700 }}>Déclenchement :</span> Au 11ème trajet</div>
              <div><span style={{ fontWeight: 700 }}>Blocage :</span> Automatique si impayé</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
