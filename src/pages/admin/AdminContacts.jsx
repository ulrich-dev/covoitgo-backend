import { useState, useEffect, useCallback, useRef } from 'react'
import { useAdmin } from '../../hooks/useAdmin'

const STATUS_MAP = {
  new:         { label: '🆕 Nouveau',   color: '#EF4444', bg: '#FEF2F2' },
  in_progress: { label: '⏳ En cours',  color: '#F59E0B', bg: '#FFFBEB' },
  resolved:    { label: '✅ Résolu',    color: '#1A9E8A', bg: '#E8F7F4' },
}

const CATEGORY_ICONS = {
  booking: '🎫', account: '👤', payment: '💰',
  safety: '🚨', suggestion: '💡', other: '📌',
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

const fmtRelative = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)    return 'À l\'instant'
  if (diff < 3600)  return `Il y a ${Math.floor(diff/60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff/3600)}h`
  return fmtDate(iso)
}

// ── Bulle de message dans le fil ─────────────────────────────
function MessageBubble({ author_type, author_name, body, created_at, email_sent }) {
  const isAdmin = author_type === 'admin'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
      {!isAdmin && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 2 }}>
          {author_name[0]?.toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 600, textAlign: isAdmin ? 'right' : 'left' }}>
          {isAdmin ? `🛡️ ${author_name} — Support` : author_name} · {fmtRelative(created_at)}
          {isAdmin && !email_sent && <span style={{ marginLeft: 6, color: '#F59E0B' }}>• Email non envoyé</span>}
          {isAdmin && email_sent && <span style={{ marginLeft: 6, color: '#1A9E8A' }}>• Email envoyé ✓</span>}
        </div>
        <div style={{
          background: isAdmin ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#fff',
          color: isAdmin ? '#fff' : '#1A1A1A',
          borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '12px 16px', fontSize: 14, lineHeight: 1.65,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          boxShadow: isAdmin ? '0 4px 14px rgba(26,158,138,.25)' : '0 2px 8px rgba(0,0,0,.06)',
          border: isAdmin ? 'none' : '1px solid rgba(0,0,0,.07)',
        }}>
          {body}
        </div>
      </div>
      {isAdmin && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0, marginTop: 2 }}>
          🛡️
        </div>
      )}
    </div>
  )
}

export default function AdminContacts() {
  const { apiFetch, loading } = useAdmin()
  const [messages,  setMessages]  = useState([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [pages,     setPages]     = useState(1)
  const [status,    setStatus]    = useState('')
  const [selected,  setSelected]  = useState(null)   // message sélectionné
  const [thread,    setThread]    = useState(null)    // { message, replies }
  const [loadingThread, setLoadingThread] = useState(false)

  // Zone de réponse
  const [replyBody,    setReplyBody]    = useState('')
  const [markResolved, setMarkResolved] = useState(false)
  const [sending,      setSending]      = useState(false)
  const [sendError,    setSendError]    = useState('')
  const [sendSuccess,  setSendSuccess]  = useState('')

  const threadBottomRef = useRef(null)

  // ── Charger la liste ─────────────────────────────────────────
  const loadList = useCallback(async () => {
    const q = new URLSearchParams({ page, limit: 20, ...(status ? { status } : {}) })
    const d = await apiFetch(`/api/contact/admin/list?${q}`)
    if (d.success) {
      setMessages(d.messages)
      setTotal(d.total)
      setPages(Math.ceil(d.total / 20))
    }
  }, [page, status])

  useEffect(() => { loadList() }, [loadList])

  // ── Ouvrir le fil de discussion ───────────────────────────────
  const openThread = async (msg) => {
    setSelected(msg)
    setThread(null)
    setReplyBody('')
    setSendError('')
    setSendSuccess('')
    setLoadingThread(true)
    const d = await apiFetch(`/api/contact/admin/${msg.id}/thread`)
    if (d.success) setThread(d)
    setLoadingThread(false)
  }

  // Scroll vers le bas du fil quand il se charge
  useEffect(() => {
    if (thread) {
      setTimeout(() => threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [thread])

  // ── Changer le statut ─────────────────────────────────────────
  const changeStatus = async (id, newStatus) => {
    const d = await apiFetch(`/api/contact/admin/${id}`, { method: 'PATCH', body: { status: newStatus } })
    if (d.success) {
      setMessages(ms => ms.map(m => m.id === id ? { ...m, status: newStatus } : m))
      if (thread && thread.message.id === id) {
        setThread(t => ({ ...t, message: { ...t.message, status: newStatus } }))
      }
      setSelected(s => s?.id === id ? { ...s, status: newStatus } : s)
    }
  }

  // ── Envoyer une réponse ───────────────────────────────────────
  const sendReply = async () => {
    if (!replyBody.trim()) { setSendError('Écrivez un message.'); return }
    setSending(true); setSendError(''); setSendSuccess('')
    const d = await apiFetch(`/api/contact/admin/${selected.id}/reply`, {
      method: 'POST',
      body: { body: replyBody, markResolved },
    })
    if (d.success) {
      // Ajouter la réponse dans le fil local
      setThread(t => ({ ...t, replies: [...t.replies, d.reply] }))
      // Mettre à jour le statut dans la liste
      const newStatus = markResolved ? 'resolved' : 'in_progress'
      setMessages(ms => ms.map(m => m.id === selected.id ? { ...m, status: newStatus } : m))
      setSelected(s => ({ ...s, status: newStatus }))
      setReplyBody('')
      setMarkResolved(false)
      setSendSuccess('Réponse envoyée ✅')
      setTimeout(() => setSendSuccess(''), 3000)
    } else {
      setSendError(d.message || 'Erreur lors de l\'envoi.')
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 132px)', fontFamily: "'Plus Jakarta Sans',sans-serif", overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 16 }}>

      {/* ══ Colonne gauche : liste ══ */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #E2E8F0', background: '#fff', overflow: 'hidden' }}>

        {/* Header liste */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <h1 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: '0 0 10px' }}>
            Messages de contact <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>({total})</span>
          </h1>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[['', 'Tous'], ['new', '🆕'], ['in_progress', '⏳'], ['resolved', '✅']].map(([val, lbl]) => (
              <button key={val} onClick={() => { setStatus(val); setPage(1) }}
                style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${status === val ? '#1A9E8A' : '#E2E8F0'}`, background: status === val ? '#E8F7F4' : '#fff', color: status === val ? '#1A9E8A' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Liste messages */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && !messages.length && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Chargement…</div>
          )}
          {!loading && !messages.length && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Aucun message</div>
            </div>
          )}
          {messages.map(m => {
            const st = STATUS_MAP[m.status] || STATUS_MAP.new
            const isSelected = selected?.id === m.id
            return (
              <div key={m.id} onClick={() => openThread(m)}
                style={{
                  padding: '13px 16px', borderBottom: '1px solid #F1F5F9',
                  background: isSelected ? '#E8F7F4' : '#fff',
                  cursor: 'pointer', transition: 'background .12s',
                  borderLeft: `3px solid ${m.status === 'new' ? '#EF4444' : m.status === 'in_progress' ? '#F59E0B' : '#E2E8F0'}`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>{CATEGORY_ICONS[m.category] || '📌'}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </span>
                  <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.subject}
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>{fmtRelative(m.created_at)}</div>
              </div>
            )
          })}

          {/* Pagination compacte */}
          {pages > 1 && (
            <div style={{ padding: '10px 16px', display: 'flex', gap: 6, justifyContent: 'center' }}>
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', color: '#64748B' }}>←</button>
              <span style={{ fontSize: 11, color: '#64748B', lineHeight: '28px' }}>{page}/{pages}</span>
              <button disabled={page===pages} onClick={() => setPage(p=>p+1)}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', color: '#64748B' }}>→</button>
            </div>
          )}
        </div>
      </div>

      {/* ══ Colonne droite : fil de discussion ══ */}
      {!selected && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', gap: 12 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#94A3B8' }}>Sélectionnez un message</div>
          <div style={{ fontSize: 12, color: '#CBD5E1' }}>pour voir le fil de discussion et répondre</div>
        </div>
      )}

      {selected && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F8FAFC' }}>

          {/* Header conversation */}
          <div style={{ background: '#fff', padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {CATEGORY_ICONS[selected.category] || '📌'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 2 }}>{selected.subject}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                {selected.name} · <a href={`mailto:${selected.email}`} style={{ color: '#1A9E8A', textDecoration: 'none' }}>{selected.email}</a> · {fmtDate(selected.created_at)}
              </div>
            </div>

            {/* Changer statut */}
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(STATUS_MAP).map(([val, s]) => {
                const current = (thread?.message?.status || selected.status) === val
                return (
                  <button key={val} onClick={() => changeStatus(selected.id, val)} disabled={current}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      border: `1.5px solid ${current ? s.color : '#E2E8F0'}`,
                      background: current ? s.bg : '#fff',
                      color: current ? s.color : '#94A3B8',
                      fontSize: 11, fontWeight: 700, cursor: current ? 'default' : 'pointer',
                      fontFamily: 'inherit', transition: 'all .15s',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fil de messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {loadingThread && (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Chargement du fil…</div>
            )}

            {thread && (
              <>
                {/* Message original */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                    Message original · {fmtDate(thread.message.created_at)}
                  </div>
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{thread.message.message}</div>
                </div>

                {/* Séparateur si des réponses existent */}
                {thread.replies.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 1, background: '#E2E8F0' }}/>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {thread.replies.length} réponse{thread.replies.length > 1 ? 's' : ''}
                    </span>
                    <div style={{ flex: 1, height: 1, background: '#E2E8F0' }}/>
                  </div>
                )}

                {/* Réponses */}
                {thread.replies.map(r => (
                  <MessageBubble key={r.id} {...r}/>
                ))}

                <div ref={threadBottomRef}/>
              </>
            )}
          </div>

          {/* Zone de réponse */}
          <div style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '16px 20px', flexShrink: 0 }}>
            {sendError   && <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>⚠️ {sendError}</div>}
            {sendSuccess && <div style={{ background: '#E8F7F4', color: '#1A9E8A', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{sendSuccess}</div>}

            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder={`Répondre à ${selected.name}…`}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 12,
                fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif",
                resize: 'vertical', outline: 'none', lineHeight: 1.65,
                transition: 'border-color .18s', marginBottom: 10,
              }}
              onFocus={e => e.target.style.borderColor = '#1A9E8A'}
              onBlur={e  => e.target.style.borderColor = 'rgba(0,0,0,.12)'}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              {/* Option marquer résolu */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748B', userSelect: 'none' }}>
                <input type="checkbox" checked={markResolved} onChange={e => setMarkResolved(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#1A9E8A', cursor: 'pointer' }}/>
                Marquer comme résolu après envoi
              </label>

              {/* Compteur + bouton */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: '#CBD5E1', fontWeight: 600 }}>{replyBody.length}/3000</span>
                <button onClick={sendReply} disabled={sending || !replyBody.trim()}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: replyBody.trim() ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#E2E8F0',
                    color: replyBody.trim() ? '#fff' : '#94A3B8',
                    fontSize: 13, fontWeight: 800, cursor: replyBody.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all .18s',
                  }}>
                  {sending
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }}/> Envoi…</>
                    : '📨 Envoyer la réponse'
                  }
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
