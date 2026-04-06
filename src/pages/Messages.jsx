import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useSocket } from '../hooks/useSocket'
import { API_URL as API } from '../utils/api'

const fmtTime = (iso) => {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7)  return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const statusLabel = (s) => ({
  pending:   { label: 'En attente',  color: '#F59E0B', bg: '#FFFBEB' },
  confirmed: { label: 'Confirmée',   color: '#1A9E8A', bg: '#E8F7F4' },
  cancelled: { label: 'Annulée',     color: '#EF4444', bg: '#FEF2F2' },
  completed: { label: 'Terminée',    color: '#6B7280', bg: '#F9FAFB' },
}[s] || { label: s, color: '#888', bg: '#f5f5f5' })

export default function Messages() {
  const { user }    = useAuth()
  const { lang }    = useLang()
  const navigate    = useNavigate()
  const [urlParams] = useSearchParams()
  const chatBodyRef = useRef(null)
  const inputRef    = useRef(null)

  const [convos,     setConvos]     = useState([])
  const [selected,   setSelected]   = useState(null)
  const [convoData,  setConvoData]  = useState(null)
  const [input,      setInput]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [error,      setError]      = useState('')
  const [mobileView, setMobileView] = useState('list')
  const [otherTyping, setOtherTyping] = useState(false)
  const typingTimer = useRef(null)

  // ── Socket.io ─────────────────────────────────────────────
  const { on, emit, joinConv, leaveConv } = useSocket(user)
  const selectedRef = useRef(null)  // ref pour accéder à selected dans les callbacks
  selectedRef.current = selected

  const urlBookingHandled = useRef(false)

  // ── Charger la liste des conversations ────────────────────
  const loadConvos = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/messages`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) setConvos(data.conversations)
      else if (res.status === 401) navigate('/login')
    } catch { setError('Impossible de charger les conversations.') }
    finally { setLoading(false) }
  }, [navigate])

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadConvos()
  }, [user, loadConvos])

  // ── Abonnements Socket.io ─────────────────────────────────
  useEffect(() => {
    // Message reçu en temps réel
    on('new_message', (msg) => {
      const bookingId = msg.bookingId
      // Si la conversation est ouverte → ajouter le message
      if (selectedRef.current === bookingId) {
        setConvoData(prev => prev
          ? { ...prev, messages: [...prev.messages, { ...msg, isFromMe: false }] }
          : prev
        )
        // Marquer lu immédiatement
        emit('mark_read', { bookingId })
      } else {
        // Sinon → incrémenter le badge
        setConvos(prev => prev.map(c =>
          c.bookingId === bookingId
            ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { content: msg.content, at: msg.at, isFromMe: false } }
            : c
        ))
      }
    })

    // Confirmation d'envoi (message propre sans temp)
    on('message_sent', (msg) => {
      setConvoData(prev => {
        if (!prev) return prev
        // Remplacer le message temp par le vrai
        const filtered = prev.messages.filter(m => !m.temp)
        return { ...prev, messages: [...filtered, { ...msg, isFromMe: true }] }
      })
      setConvos(prev => prev.map(c =>
        c.bookingId === msg.bookingId
          ? { ...c, lastMessage: { content: msg.content, at: msg.at, isFromMe: true } }
          : c
      ))
    })

    // L'autre est en train d'écrire
    on('typing', ({ isTyping }) => {
      setOtherTyping(isTyping)
      if (isTyping) {
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setOtherTyping(false), 3000)
      }
    })

    // Messages lus par l'autre
    on('messages_read', ({ bookingId }) => {
      if (selectedRef.current === bookingId) {
        setConvoData(prev => prev
          ? { ...prev, messages: prev.messages.map(m => ({ ...m, isRead: true })) }
          : prev
        )
      }
    })

    // Erreur socket
    on('message_error', ({ error: err }) => {
      setConvoData(prev => prev
        ? { ...prev, messages: prev.messages.filter(m => !m.temp) }
        : prev
      )
      setInput(prev => prev || '')
      setSending(false)
    })
  }, [on, emit])

  // ── Ouvrir depuis l'URL ───────────────────────────────────
  useEffect(() => {
    const bid = urlParams.get('booking')
    if (bid && convos.length > 0 && !urlBookingHandled.current) {
      urlBookingHandled.current = true
      openConvo(bid)
    }
  }, [convos])

  // ── Ouvrir une conversation ───────────────────────────────
  const openConvo = async (bookingId) => {
    if (selected === bookingId) return
    // Quitter l'ancienne salle
    if (selected) leaveConv(selected)

    setSelected(bookingId)
    setMobileView('chat')
    setLoadingMsg(true)
    setOtherTyping(false)
    try {
      const res  = await fetch(`${API}/api/messages/${bookingId}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setConvoData(data)
        setConvos(prev => prev.map(c =>
          c.bookingId === bookingId ? { ...c, unreadCount: 0 } : c
        ))
        // Rejoindre la salle WebSocket
        joinConv(bookingId)
        emit('mark_read', { bookingId })
      }
    } catch { setError('Erreur lors du chargement.') }
    finally { setLoadingMsg(false) }
  }

  // ── Fermer → quitter la salle ─────────────────────────────
  const closeConvo = () => {
    if (selected) leaveConv(selected)
    setSelected(null)
    setConvoData(null)
    setMobileView('list')
  }

  // ── Scroll en bas ─────────────────────────────────────────
  const scrollToBottom = (smooth = true) => {
    const el = chatBodyRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }

  useEffect(() => { scrollToBottom() }, [convoData?.messages?.length, otherTyping])
  useEffect(() => {
    if (convoData && !loadingMsg) inputRef.current?.focus()
  }, [convoData, loadingMsg])

  // ── Envoyer via Socket.io ─────────────────────────────────
  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim() || sending || !selected) return
    setSending(true)
    const content = input.trim()
    setInput('')

    // Message optimiste
    const tempMsg = {
      id: 'temp-' + Date.now(),
      content, bookingId: selected,
      isFromMe: true,
      senderName: user.firstName || 'Moi',
      avatar: user.firstName?.[0]?.toUpperCase() || 'M',
      color: '#1A9E8A',
      isRead: false,
      at: new Date().toISOString(),
      temp: true,
    }
    setConvoData(prev => ({ ...prev, messages: [...prev.messages, tempMsg] }))

    // Émettre via socket
    emit('send_message', { bookingId: selected, content })
    setSending(false)
    emit('typing', { bookingId: selected, isTyping: false })
  }

  // ── Indicateur "en train d'écrire" ───────────────────────
  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (selected) {
      emit('typing', { bookingId: selected, isTyping: e.target.value.length > 0 })
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => {
        emit('typing', { bookingId: selected, isTyping: false })
      }, 2000)
    }
  }

  const totalUnread = convos.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  if (!user) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes msgIn     { from{opacity:0;transform:translateY(8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }

        .msg-page {
          height: calc(100vh - 72px);
          display: flex;
          background: #f5f5f5;
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow: hidden;
        }

        /* ── Sidebar ── */
        .msg-sidebar {
          width: 360px; flex-shrink: 0;
          background: #fff;
          border-right: 1px solid rgba(0,0,0,0.08);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .msg-sidebar-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          flex-shrink: 0;
        }

        /* ── Conversation item ── */
        .conv-item {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; cursor: pointer;
          transition: background .15s; border-bottom: 1px solid rgba(0,0,0,0.04);
          position: relative;
        }
        .conv-item:hover   { background: #fafafa; }
        .conv-item.active  { background: #E8F7F4; }
        .conv-item.unread  { background: #fafffe; }
        .conv-avatar {
          width: 46px; height: 46px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 17px; color: #fff;
          flex-shrink: 0; position: relative;
        }
        .conv-unread-dot {
          position: absolute; bottom: 0; right: 0;
          width: 14px; height: 14px; border-radius: 50%;
          background: #1A9E8A; border: 2px solid #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 7px; font-weight: 800; color: #fff;
        }

        /* ── Chat panel ── */
        .msg-chat {
          flex: 1; display: flex; flex-direction: column; overflow: hidden;
          background: #f5f5f5;
        }
        .msg-chat-header {
          background: #fff; padding: 14px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.07);
          display: flex; align-items: center; gap: 12px;
          flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .msg-body {
          flex: 1; overflow-y: auto; padding: 20px 24px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .msg-body::-webkit-scrollbar { width: 4px; }
        .msg-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }

        /* ── Bubbles ── */
        .bubble-row {
          display: flex; align-items: flex-end; gap: 8px;
          animation: msgIn .22s ease both;
          margin-bottom: 2px;
        }
        .bubble-row.me   { flex-direction: row-reverse; }
        .bubble-row.me .bubble {
          background: #1A9E8A; color: #fff;
          border-radius: 18px 18px 4px 18px;
        }
        .bubble-row.them .bubble {
          background: #fff; color: #1A1A1A;
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .bubble {
          /* La largeur max est gérée par le div wrapper parent */
          width: fit-content;
          padding: 9px 14px;
          font-size: 14.5px;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: break-word;
          word-break: normal;
        }
        .bubble-time {
          font-size: 10px; color: #bbb;
          margin-top: 3px; padding: 0 4px;
          display: flex; align-items: center; gap: 4px;
        }
        .bubble-row.me   .bubble-time { justify-content: flex-end; }
        .bubble-row.them .bubble-time { justify-content: flex-start; }
        .bubble-avatar-sm {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: #fff;
          flex-shrink: 0; margin-bottom: 18px;
        }
        .bubble-temp { opacity: .6; }

        /* ── Date separator ── */
        .date-sep {
          display: flex; align-items: center; gap: 12px;
          margin: 12px 0; color: #aaa; font-size: 11px; font-weight: 600;
        }
        .date-sep::before,.date-sep::after { content:''; flex:1; height:1px; background:rgba(0,0,0,0.08); }

        /* ── Input bar ── */
        .msg-input-bar {
          background: #fff; padding: 12px 16px 10px;
          border-top: 1px solid rgba(0,0,0,0.07);
          display: flex; flex-direction: column; gap: 6px;
          flex-shrink: 0;
        }
        .msg-input-row {
          display: flex; gap: 10px; align-items: flex-end;
        }
        .msg-input {
          flex: 1; border: 1.5px solid rgba(0,0,0,0.12); border-radius: 16px;
          padding: 10px 16px; font-size: 14px; font-family: inherit;
          outline: none; resize: none;
          min-height: 42px; max-height: 140px;
          line-height: 1.6;
          transition: border-color .2s; background: #fafafa;
          /* Respecter les retours à la ligne du texte saisi */
          white-space: pre-wrap;
          overflow-y: auto;
        }
        .msg-input:focus { border-color: #1A9E8A; background: #fff; }
        .msg-input-hint {
          font-size: 10.5px; color: #bbb; font-weight: 500;
          padding: 0 4px; text-align: right; line-height: 1;
        }
        .msg-send-btn {
          width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
          background: #1A9E8A; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; transition: all .18s; box-shadow: 0 4px 12px rgba(26,158,138,0.35);
        }
        .msg-send-btn:hover:not(:disabled) { background: #157A6B; transform: scale(1.06); }
        .msg-send-btn:disabled { background: #ccc; cursor: default; box-shadow: none; }

        /* ── Empty state ── */
        .msg-empty {
          flex:1; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:14px;
          color:#aaa; text-align:center; padding:40px;
        }

        /* ── Responsive ── */
        @media(max-width:760px) {
          .msg-sidebar { width: 100%; display: ${`var(--sidebar-display, flex)`}; }
          .msg-chat    { display: ${`var(--chat-display, none)`}; }
          .msg-back-btn { display: flex !important; }
        }
      `}</style>

      <div className="msg-page" style={{
        '--sidebar-display': mobileView === 'list' ? 'flex' : 'none',
        '--chat-display':    mobileView === 'chat' ? 'flex' : 'none',
      }}>

        {/* ══════════════════════════════════
            SIDEBAR — Liste des conversations
            ══════════════════════════════════ */}
        <aside className="msg-sidebar">
          <div className="msg-sidebar-header">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <h1 style={{ fontSize:20, fontWeight:800, color:'#1A1A1A', letterSpacing:'-0.03em' }}>
                {lang === 'fr' ? 'Messages' : 'Messages'}
                {totalUnread > 0 && (
                  <span style={{ marginLeft:10, background:'#1A9E8A', color:'#fff', borderRadius:20, fontSize:11, fontWeight:800, padding:'2px 8px' }}>
                    {totalUnread}
                  </span>
                )}
              </h1>
              <button onClick={loadConvos}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#888', padding:4 }}
                title="Rafraîchir">↻</button>
            </div>
            <p style={{ fontSize:12, color:'#aaa', margin:0 }}>
              {lang === 'fr'
                ? `${convos.length} conversation${convos.length !== 1 ? 's' : ''}`
                : `${convos.length} conversation${convos.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Liste */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #e8e8e8', borderTopColor:'#1A9E8A', animation:'spin .9s linear infinite' }} />
              </div>
            ) : convos.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#aaa' }}>
                <div style={{ fontSize:44, marginBottom:12 }}>💬</div>
                <div style={{ fontWeight:700, fontSize:15, color:'#555', marginBottom:8 }}>
                  {lang === 'fr' ? 'Aucune conversation' : 'No conversations'}
                </div>
                <p style={{ fontSize:13, lineHeight:1.6, marginBottom:16 }}>
                  {lang === 'fr'
                    ? 'Réservez un trajet pour démarrer une conversation avec le conducteur.'
                    : 'Book a ride to start a conversation with the driver.'}
                </p>
                <Link to="/search">
                  <button style={{ background:'#1A9E8A', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    {lang === 'fr' ? 'Trouver un trajet' : 'Find a ride'}
                  </button>
                </Link>
              </div>
            ) : (
              convos.map(conv => (
                <div key={conv.bookingId}
                  className={`conv-item${selected === conv.bookingId ? ' active' : ''}${conv.unreadCount > 0 ? ' unread' : ''}`}
                  onClick={() => openConvo(conv.bookingId)}>

                  {/* Avatar */}
                  <div className="conv-avatar" style={{ background: conv.other.color }}>
                    {conv.other.avatar}
                    {conv.unreadCount > 0 && (
                      <div className="conv-unread-dot">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                      <span style={{ fontWeight: conv.unreadCount > 0 ? 800 : 600, fontSize:14, color:'#1A1A1A' }}>
                        {conv.other.name}
                      </span>
                      <span style={{ fontSize:11, color:'#bbb', flexShrink:0 }}>
                        {conv.lastMessage ? fmtTime(conv.lastMessage.at) : fmtTime(conv.departureAt)}
                      </span>
                    </div>
                    {/* Route */}
                    <div style={{ fontSize:12, color:'#1A9E8A', fontWeight:700, marginBottom:3 }}>
                      {conv.from} → {conv.to}
                    </div>
                    {/* Last message preview */}
                    <div style={{ fontSize:12.5, color: conv.unreadCount > 0 ? '#333' : '#aaa', fontWeight: conv.unreadCount > 0 ? 600 : 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {conv.lastMessage
                        ? `${conv.lastMessage.isFromMe ? (lang === 'fr' ? 'Moi : ' : 'Me: ') : ''}${conv.lastMessage.content}`
                        : (lang === 'fr' ? 'Démarrez la conversation...' : 'Start the conversation...')}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ ...statusLabel(conv.bookingStatus), padding:'2px 7px', borderRadius:6, fontSize:10, fontWeight:700, flexShrink:0 }}>
                    {statusLabel(conv.bookingStatus).label}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ══════════════════════════════════
            CHAT — Messages
            ══════════════════════════════════ */}
        <div className="msg-chat">
          {!selected ? (
            <div className="msg-empty">
              <div style={{ fontSize:56 }}>💬</div>
              <div style={{ fontWeight:800, fontSize:17, color:'#555' }}>
                {lang === 'fr' ? 'Sélectionnez une conversation' : 'Select a conversation'}
              </div>
              <p style={{ fontSize:13.5, maxWidth:280, lineHeight:1.7 }}>
                {lang === 'fr'
                  ? 'Choisissez une conversation dans la liste pour voir les messages.'
                  : 'Choose a conversation from the list to view messages.'}
              </p>
            </div>
          ) : loadingMsg ? (
            <div className="msg-empty">
              <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #e8e8e8', borderTopColor:'#1A9E8A', animation:'spin .9s linear infinite' }} />
            </div>
          ) : convoData ? (
            <>
              {/* Header */}
              <div className="msg-chat-header">
                {/* Mobile back */}
                <button className="msg-back-btn"
                  style={{ display:'none', background:'none', border:'none', cursor:'pointer', fontSize:20, padding:'0 4px', color:'#555', flexShrink:0 }}
                  onClick={() => setMobileView('list')}>
                  ←
                </button>

                {/* Avatar */}
                <div style={{ width:42, height:42, borderRadius:'50%', background:convoData.conversation.other.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:16, color:'#fff', flexShrink:0 }}>
                  {convoData.conversation.other.avatar}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:'#1A1A1A' }}>
                    {convoData.conversation.other.name}
                  </div>
                  <div style={{ fontSize:12, color:'#888' }}>
                    {convoData.conversation.from} → {convoData.conversation.to}
                    {convoData.conversation.departureAt && (
                      <span style={{ marginLeft:8, color:'#1A9E8A', fontWeight:600 }}>
                        · {new Date(convoData.conversation.departureAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <div style={{ background: convoData.conversation.myRole === 'driver' ? '#E8F7F4' : '#F3EEFF', color: convoData.conversation.myRole === 'driver' ? '#1A9E8A' : '#7C3AED', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:800, flexShrink:0 }}>
                  {convoData.conversation.myRole === 'driver'
                    ? (lang === 'fr' ? '🚗 Conducteur' : '🚗 Driver')
                    : (lang === 'fr' ? '🧳 Passager' : '🧳 Passenger')}
                </div>
              </div>

              {/* Messages */}
              <div className="msg-body" ref={chatBodyRef}>
                {convoData.messages.length === 0 && (
                  <div style={{ textAlign:'center', padding:'40px 20px', color:'#bbb' }}>
                    <div style={{ fontSize:36, marginBottom:12 }}>👋</div>
                    <div style={{ fontWeight:600, fontSize:14, color:'#888', marginBottom:6 }}>
                      {lang === 'fr' ? 'Démarrez la conversation !' : 'Start the conversation!'}
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.6 }}>
                      {lang === 'fr'
                        ? `Présentez-vous à ${convoData.conversation.other.name.split(' ')[0]} et coordonnez votre trajet.`
                        : `Introduce yourself to ${convoData.conversation.other.name.split(' ')[0]} and coordinate your ride.`}
                    </p>
                  </div>
                )}

                {/* Render messages with date separators */}
                {convoData.messages.reduce((acc, msg, i) => {
                  const prev = convoData.messages[i - 1]
                  const msgDate = new Date(msg.at).toDateString()
                  const prevDate = prev ? new Date(prev.at).toDateString() : null

                  // Date separator
                  if (msgDate !== prevDate) {
                    acc.push(
                      <div key={`sep-${i}`} className="date-sep">
                        {fmtDate(msg.at)}
                      </div>
                    )
                  }

                  // Same sender grouping
                  const isSameSender = prev && prev.isFromMe === msg.isFromMe && msgDate === prevDate
                  const showAvatar = !isSameSender

                  acc.push(
                    <div key={msg.id} className={`bubble-row ${msg.isFromMe ? 'me' : 'them'}${msg.temp ? ' bubble-temp' : ''}`}
                      style={{ marginTop: isSameSender ? 2 : 10 }}>
                      {!msg.isFromMe && showAvatar && (
                        <div className="bubble-avatar-sm" style={{ background: msg.color || '#888' }}>{msg.avatar}</div>
                      )}
                      {!msg.isFromMe && !showAvatar && <div style={{ width:28, flexShrink:0 }} />}

                      {/* wrapper : limité à 70% de la zone de chat */}
                      <div style={{ maxWidth:'min(70%, 460px)', minWidth:0 }}>
                        <div className="bubble">{msg.content}</div>
                        {!isSameSender && (
                          <div className="bubble-time">
                            {fmtTime(msg.at)}
                            {msg.isFromMe && (
                              <span style={{ marginLeft:4 }}>
                                {msg.temp ? '⏳' : msg.isRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {msg.isFromMe && showAvatar && (
                        <div className="bubble-avatar-sm" style={{ background:'#1A9E8A' }}>
                          {user.name?.[0]?.toUpperCase() || 'M'}
                        </div>
                      )}
                      {msg.isFromMe && !showAvatar && <div style={{ width:28, flexShrink:0 }} />}
                    </div>
                  )
                  return acc
                }, [])}

              </div>

              {/* Indicateur "en train d'écrire" */}
              {otherTyping && (
                <div style={{ padding:'4px 20px 2px', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'flex', gap:3 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#94A3B8',
                        animation:`bounce .9s ease ${i*0.15}s infinite` }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:11, color:'#94A3B8', fontStyle:'italic' }}>
                    {convoData?.conversation?.other?.name?.split(' ')[0]} est en train d'écrire…
                  </span>
                  <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
                </div>
              )}

              {/* Input bar */}
              <div className="msg-input-bar">
                <div className="msg-input-row">
                  <textarea
                    ref={inputRef}
                    className="msg-input"
                    rows={1}
                    placeholder={lang === 'fr' ? 'Écrire un message...' : 'Write a message...'}
                    value={input}
                    onChange={e => {
                      handleInputChange(e)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) }
                    }}
                  />
                  <button className="msg-send-btn"
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}>
                    {sending
                      ? <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', animation:'spin .8s linear infinite' }} />
                      : '➤'}
                  </button>
                </div>
                {input.length > 0 && (
                  <div className="msg-input-hint">
                    Shift + Entrée pour un retour à la ligne · Entrée pour envoyer
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
