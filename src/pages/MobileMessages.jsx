import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'

// ══════════════════════════════════════════════════════════════
//  MobileMessages — Liste des conversations + vue chat
// ══════════════════════════════════════════════════════════════

export default function MobileMessages() {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const [convos,   setConvos]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [convoData, setConvoData] = useState(null)
  const [input,    setInput]    = useState('')
  const [sending,  setSending]  = useState(false)
  const chatRef = useRef(null)

  // Charger les conversations
  useEffect(() => {
    if (!user) { setLoading(false); return }
    const load = async () => {
      try {
        const res  = await authFetch(`${API_URL}/api/messages`, {})
        const data = await res.json()
        if (data.success) setConvos(data.conversations || [])
      } catch {}
      finally { setLoading(false) }
    }
    load()

    // Ouvrir automatiquement une conversation depuis l'URL
    const bid = params.get('booking')
    if (bid) openConvo(bid)
  }, [user])

  // Scroll bas à chaque message
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [convoData])

  const openConvo = async (bookingId) => {
    setSelected(bookingId)
    try {
      const res  = await authFetch(`${API_URL}/api/messages/${bookingId}`, {})
      const data = await res.json()
      if (data.success) setConvoData(data)
    } catch {}
  }

  const sendMessage = async () => {
    if (!input.trim() || sending || !selected) return
    const content = input.trim()
    setInput(''); setSending(true)
    try {
      const res  = await authFetch(`${API_URL}/api/messages/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.success) {
        setConvoData(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev)
      }
    } catch {}
    finally { setSending(false) }
  }

  if (!user) return (
    <div style={{ padding:'80px 24px', textAlign:'center', background:'#F7F8FA', minHeight:'100vh' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>💬</div>
      <h2 style={{ fontSize:20, fontWeight:900, color:'#111827', marginBottom:8 }}>Messages</h2>
      <p style={{ fontSize:14, color:'#6B7280', marginBottom:32 }}>Connectez-vous pour voir vos messages</p>
      <button onClick={() => navigate('/login')}
        style={{ padding:'14px 40px', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', border:'none', borderRadius:30, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
        Se connecter
      </button>
    </div>
  )

  // ── Vue conversation ────────────────────────────────────────
  if (selected && convoData) return (
    <div style={{ position:'fixed', inset:0, background:'#F7F8FA', display:'flex', flexDirection:'column', zIndex:500, fontFamily:"-apple-system,sans-serif" }}>

      {/* Header conversation */}
      <div style={{ background:'#fff', padding:'12px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => { setSelected(null); setConvoData(null) }}
          style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'#111', padding:0, lineHeight:1 }}>
          ‹
        </button>
        <div style={{ width:40, height:40, borderRadius:'50%', background: convoData.conversation.other.color || '#1A9E8A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#fff' }}>
          {convoData.conversation.other.avatar}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#111' }}>
            {convoData.conversation.other.name}
          </div>
          <div style={{ fontSize:12, color:'#6B7280' }}>
            {convoData.conversation.from} → {convoData.conversation.to}
          </div>
        </div>
        {convoData.conversation.status === 'confirmed' && (
          <button
            style={{ width:40, height:40, borderRadius:'50%', border:'none', background:'#E8F7F4', color:'#1A9E8A', fontSize:18, cursor:'pointer' }}>
            📞
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {convoData.messages?.map((msg, i) => {
          const isMe = msg.isFromMe
          return (
            <div key={msg.id || i} style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom:8 }}>
              <div style={{
                maxWidth:'75%',
                background: isMe ? '#1A9E8A' : '#fff',
                color: isMe ? '#fff' : '#111',
                padding:'10px 14px',
                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontSize:14, lineHeight:1.4,
                boxShadow: '0 1px 2px rgba(0,0,0,.04)',
              }}>
                {msg.content}
              </div>
            </div>
          )
        })}
        {convoData.messages?.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#9CA3AF', fontSize:13 }}>
            Envoyez le premier message
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding:'12px 16px', background:'#fff', borderTop:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:10, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Message…"
          style={{ flex:1, padding:'12px 16px', borderRadius:24, border:'1.5px solid #E5E7EB', fontSize:14, fontFamily:'inherit', outline:'none', background:'#F7F8FA' }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          style={{ width:44, height:44, borderRadius:'50%', border:'none', background: input.trim() ? '#1A9E8A' : '#E5E7EB', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          ➤
        </button>
      </div>
    </div>
  )

  // ── Liste conversations ─────────────────────────────────────
  return (
    <div style={{ background:'#F7F8FA', minHeight:'100vh', paddingBottom:80, fontFamily:"-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#fff', padding:'48px 20px 16px', borderBottom:'1px solid #F3F4F6' }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:'#111', margin:0, letterSpacing:'-.03em' }}>
          Messages
        </h1>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #E5E7EB', borderTopColor:'#1A9E8A', margin:'0 auto 12px', animation:'spin .8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && convos.length === 0 && (
        <div style={{ textAlign:'center', padding:'80px 20px' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>💬</div>
          <p style={{ fontSize:17, fontWeight:800, color:'#111', margin:'0 0 6px' }}>Aucun message</p>
          <p style={{ fontSize:14, color:'#9CA3AF' }}>Contactez un conducteur pour démarrer une conversation</p>
        </div>
      )}

      {!loading && convos.map(c => (
        <button key={c.bookingId} onClick={() => openConvo(c.bookingId)}
          style={{ width:'100%', background:'#fff', border:'none', borderBottom:'1px solid #F3F4F6', padding:'16px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background: c.other?.color || '#1A9E8A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff', flexShrink:0 }}>
            {c.other?.avatar || '?'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#111' }}>{c.other?.name}</div>
              {c.lastMessage?.at && (
                <div style={{ fontSize:11, color:'#9CA3AF', fontWeight:600 }}>
                  {new Date(c.lastMessage.at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
                </div>
              )}
            </div>
            <div style={{ fontSize:12, color:'#6B7280', marginBottom:3 }}>{c.from} → {c.to}</div>
            <div style={{ fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: c.unreadCount > 0 ? 700 : 400 }}>
              {c.lastMessage?.content || 'Nouvelle conversation'}
            </div>
          </div>
          {c.unreadCount > 0 && (
            <div style={{ minWidth:20, height:20, borderRadius:10, background:'#1A9E8A', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 6px', flexShrink:0 }}>
              {c.unreadCount}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
