import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'

export default function MobileMessages() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const [convos,    setConvos]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [activeId,  setActiveId]  = useState(null) // bookingId actif
  const [msgs,      setMsgs]      = useState([])
  const [meta,      setMeta]      = useState(null)
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [chatLoad,  setChatLoad]  = useState(false)
  const chatRef  = useRef(null)
  const pollRef  = useRef(null)

  // ── Charger la liste des conversations ──────────────────────
  const loadList = useCallback(async () => {
    if (!user) return
    try {
      const res  = await authFetch(`${API_URL}/api/messages`, {})
      const data = await res.json()
      if (data.success) {
        // Normalise : conversations peut être data.conversations ou data.threads etc.
        const list = data.conversations || data.threads || data.chats || []
        setConvos(normConvos(list))
      }
    } catch {} finally { setLoading(false) }
  }, [user])

  useEffect(() => { loadList() }, [loadList])

  // Ouvrir conversation depuis URL (?trip=xxx ou ?booking=xxx)
  useEffect(() => {
    const id = params.get('booking') || params.get('trip')
    if (id) openChat(id)
  }, [params])

  // ── Ouvrir une conversation ──────────────────────────────────
  const openChat = async (bookingId) => {
    if (!bookingId) return
    setActiveId(bookingId); setChatLoad(true); setMsgs([])
    try {
      const res  = await authFetch(`${API_URL}/api/messages/${bookingId}`, {})
      const data = await res.json()
      if (data.success) {
        setMsgs(normMsgs(data.messages || data.msgs || []))
        setMeta(normMeta(data))
      }
    } catch {} finally { setChatLoad(false) }

    // Polling toutes les 5s pour les nouveaux messages
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const r = await authFetch(`${API_URL}/api/messages/${bookingId}`, {})
        const d = await r.json()
        if (d.success) setMsgs(normMsgs(d.messages || d.msgs || []))
      } catch {}
    }, 5000)
  }

  const closeChat = () => {
    clearInterval(pollRef.current)
    setActiveId(null); setMsgs([]); setMeta(null)
    loadList()
  }

  // Scroll vers le bas quand nouveaux messages
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [msgs])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // ── Envoyer un message ───────────────────────────────────────
  const sendMsg = async () => {
    const content = input.trim()
    if (!content || sending || !activeId) return
    setInput(''); setSending(true)
    // Ajout optimiste
    const tmp = { id:`tmp-${Date.now()}`, content, isFromMe:true, createdAt:new Date().toISOString(), pending:true }
    setMsgs(m=>[...m,tmp])
    try {
      const res  = await authFetch(`${API_URL}/api/messages/${activeId}`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ content, message:content }),
      })
      const data = await res.json()
      if (data.success && data.message) {
        setMsgs(m=>m.map(x=>x.id===tmp.id ? normMsg(data.message) : x))
      } else {
        // Retirer le message optimiste si erreur
        setMsgs(m=>m.filter(x=>x.id!==tmp.id))
        setInput(content)
      }
    } catch {
      setMsgs(m=>m.filter(x=>x.id!==tmp.id))
      setInput(content)
    } finally { setSending(false) }
  }

  // ── Pas connecté ─────────────────────────────────────────────
  if (!user) return (
    <div style={{padding:'80px 24px',textAlign:'center',background:'#F7F8FA',minHeight:'100vh',fontFamily:"-apple-system,sans-serif"}}>
      <div style={{fontSize:56,marginBottom:16}}>💬</div>
      <h2 style={{fontSize:20,fontWeight:900,color:'#111',marginBottom:8}}>Messages</h2>
      <p style={{fontSize:14,color:'#6B7280',marginBottom:28}}>Connectez-vous pour accéder à vos messages</p>
      <button onClick={()=>navigate('/login')} style={{padding:'14px 36px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:30,fontSize:15,fontWeight:800,cursor:'pointer'}}>
        Se connecter
      </button>
    </div>
  )

  // ── Vue chat ─────────────────────────────────────────────────
  if (activeId) {
    const other = meta?.other || {}
    return (
      <div style={{position:'fixed',inset:0,background:'#F7F8FA',display:'flex',flexDirection:'column',zIndex:1100,fontFamily:"-apple-system,sans-serif"}}>

        {/* Header */}
        <div style={{background:'#fff',padding:'14px 16px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
          <button onClick={closeChat} style={{background:'none',border:'none',fontSize:26,cursor:'pointer',color:'#111',padding:0,lineHeight:1}}>‹</button>
          <div style={{width:40,height:40,borderRadius:'50%',background:other.color||'#1A9E8A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'#fff',flexShrink:0}}>
            {other.avatar||other.name?.[0]||'?'}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:'#111',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{other.name||'Conversation'}</div>
            {meta?.from && <div style={{fontSize:12,color:'#6B7280'}}>{meta.from} → {meta.to}</div>}
          </div>
          {meta?.status==='confirmed' && (
            <button style={{width:36,height:36,borderRadius:'50%',border:'none',background:'#E8F7F4',color:'#1A9E8A',fontSize:18,cursor:'pointer'}}>📞</button>
          )}
        </div>

        {/* Bandeau trajet */}
        {meta?.from && (
          <div style={{background:'#E8F7F4',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <span style={{fontSize:14}}>🚗</span>
            <div style={{flex:1,fontSize:12,color:'#0f766e',fontWeight:700}}>
              {meta.from} → {meta.to} · {meta.date ? new Date(meta.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : ''}
            </div>
            <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:10,
              background:meta.status==='confirmed'?'#D1FAE5':meta.status==='pending'?'#FEF3C7':'#F3F4F6',
              color:meta.status==='confirmed'?'#065F46':meta.status==='pending'?'#92400E':'#374151'}}>
              {meta.status==='confirmed'?'Confirmé':meta.status==='pending'?'En attente':meta.status||''}
            </span>
          </div>
        )}

        {/* Messages */}
        <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:8}}>
          {chatLoad && (
            <div style={{textAlign:'center',padding:40,color:'#9CA3AF',fontSize:13}}>Chargement…</div>
          )}
          {!chatLoad && msgs.length===0 && (
            <div style={{textAlign:'center',padding:'60px 20px',color:'#9CA3AF',fontSize:14}}>
              <div style={{fontSize:40,marginBottom:12}}>💬</div>
              Envoyez le premier message !
            </div>
          )}
          {msgs.map((msg,i)=>{
            const isMe = msg.isFromMe
            return (
              <div key={msg.id||i} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',alignItems:'flex-end',gap:8}}>
                {!isMe && (
                  <div style={{width:28,height:28,borderRadius:'50%',background:other.color||'#1A9E8A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff',flexShrink:0}}>
                    {other.avatar||'?'}
                  </div>
                )}
                <div style={{maxWidth:'72%'}}>
                  <div style={{
                    background:isMe?'#1A9E8A':'#fff',
                    color:isMe?'#fff':'#111',
                    padding:'10px 14px',
                    borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                    fontSize:14,lineHeight:1.45,
                    boxShadow:'0 1px 3px rgba(0,0,0,.06)',
                    opacity:msg.pending?.5:1,
                  }}>
                    {msg.content}
                  </div>
                  <div style={{fontSize:10,color:'#9CA3AF',marginTop:3,textAlign:isMe?'right':'left',fontWeight:600}}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : ''}
                    {msg.pending ? ' · envoi…' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div style={{background:'#fff',padding:'12px 16px',borderTop:'1px solid #F3F4F6',display:'flex',alignItems:'center',gap:10,paddingBottom:'calc(12px + env(safe-area-inset-bottom))'}}>
          <input type="text" value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendMsg()}
            placeholder="Message…"
            style={{flex:1,padding:'12px 16px',borderRadius:24,border:'1.5px solid #E5E7EB',fontSize:14,fontFamily:'inherit',outline:'none',background:'#F7F8FA'}}/>
          <button onClick={sendMsg} disabled={!input.trim()||sending}
            style={{width:44,height:44,borderRadius:'50%',border:'none',background:input.trim()?'#1A9E8A':'#E5E7EB',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
            ➤
          </button>
        </div>
      </div>
    )
  }

  // ── Liste des conversations ──────────────────────────────────
  return (
    <div style={{background:'#F7F8FA',minHeight:'100vh',paddingBottom:80,fontFamily:"-apple-system,sans-serif"}}>

      {/* Header */}
      <div style={{background:'#fff',padding:'48px 20px 16px',borderBottom:'1px solid #F3F4F6'}}>
        <h1 style={{fontSize:28,fontWeight:900,color:'#111',margin:0,letterSpacing:'-.03em'}}>Messages</h1>
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:'60px 0'}}>
          <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #E5E7EB',borderTopColor:'#1A9E8A',margin:'0 auto 12px',animation:'spin .8s linear infinite'}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && convos.length===0 && (
        <div style={{textAlign:'center',padding:'80px 20px'}}>
          <div style={{fontSize:56,marginBottom:16}}>💬</div>
          <p style={{fontSize:17,fontWeight:800,color:'#111',margin:'0 0 6px'}}>Aucun message</p>
          <p style={{fontSize:14,color:'#9CA3AF',margin:'0 0 28px'}}>Contactez un conducteur pour démarrer une conversation</p>
          <button onClick={()=>navigate('/search')} style={{padding:'13px 28px',background:'linear-gradient(135deg,#1A9E8A,#22C6AD)',color:'#fff',border:'none',borderRadius:30,fontSize:14,fontWeight:800,cursor:'pointer'}}>
            Rechercher un trajet
          </button>
        </div>
      )}

      {convos.map(c=>(
        <button key={c.id} onClick={()=>openChat(c.id)}
          style={{width:'100%',background:'#fff',border:'none',borderBottom:'1px solid #F3F4F6',padding:'16px 20px',display:'flex',alignItems:'center',gap:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:50,height:50,borderRadius:'50%',background:c.color||'#1A9E8A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:'#fff'}}>
              {c.avatar||c.name?.[0]||'?'}
            </div>
            {c.unread>0 && (
              <div style={{position:'absolute',top:-2,right:-2,minWidth:18,height:18,background:'#EF4444',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff',border:'2px solid #fff',padding:'0 4px'}}>
                {c.unread>9?'9+':c.unread}
              </div>
            )}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
              <div style={{fontSize:15,fontWeight:800,color:'#111',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginRight:8}}>
                {c.name}
              </div>
              {c.lastAt && <div style={{fontSize:11,color:'#9CA3AF',fontWeight:600,flexShrink:0}}>
                {new Date(c.lastAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}
              </div>}
            </div>
            {(c.from||c.to) && <div style={{fontSize:12,color:'#6B7280',marginBottom:3,fontWeight:600}}>{c.from} → {c.to}</div>}
            <div style={{fontSize:13,color:c.unread>0?'#111':'#9CA3AF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:c.unread>0?700:400}}>
              {c.lastMsg || 'Nouvelle conversation'}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Normaliseurs — s'adapte à n'importe quelle structure backend ─
function normConvos(list) {
  return list.map(c => ({
    id:     c.bookingId  || c.id          || c.booking_id || '',
    name:   c.other?.name || c.otherName  || c.driverName || c.passengerName || c.name || '?',
    avatar: c.other?.avatar || c.otherAvatar || (c.other?.name||c.otherName||'?')[0]?.toUpperCase() || '?',
    color:  c.other?.color || c.otherColor || '#1A9E8A',
    from:   c.from || c.originCity || c.origin_city || '',
    to:     c.to   || c.destinationCity || c.destination_city || '',
    lastMsg: c.lastMessage?.content || c.lastMsg || c.last_message || '',
    lastAt:  c.lastMessage?.at || c.lastAt || c.updatedAt || null,
    unread:  c.unreadCount || c.unread || 0,
  }))
}
function normMsg(m) {
  const me = m.isFromMe ?? m.is_from_me ?? m.fromMe ?? m.isMine ?? (m.direction==='out') ?? false
  return {
    id:        m.id,
    content:   m.content || m.body || m.text || '',
    isFromMe:  me,
    createdAt: m.createdAt || m.created_at || m.sentAt || m.timestamp || null,
  }
}
function normMsgs(list) {
  return list.map(normMsg)
}
function normMeta(data) {
  const c = data.conversation || data.thread || data.booking || data
  return {
    other:  c.other || { name: c.otherName||c.driverName||c.passengerName||'', avatar:(c.otherName||c.driverName||'?')[0]?.toUpperCase(), color:c.otherColor||'#1A9E8A' },
    from:   c.from  || c.originCity   || c.origin_city   || '',
    to:     c.to    || c.destinationCity || c.destination_city || '',
    date:   c.departureAt || c.departure_time || null,
    status: c.status || '',
  }
}
