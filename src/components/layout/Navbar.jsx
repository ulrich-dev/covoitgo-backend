import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LangContext'
import { API_URL as API, authFetch } from '../../utils/api'

// ── Formater temps relatif ────────────────────────────────────
const relTime = (iso) => {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)   return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff/60)} min`
  if (diff < 86400)return `Il y a ${Math.floor(diff/3600)}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
}

export default function Navbar() {
  const { user, logout }        = useAuth()
  const { lang, toggleLang, t } = useLang()
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [userMenu,     setUserMenu]     = useState(false)
  const [bellOpen,     setBellOpen]     = useState(false)
  const [unread,       setUnread]       = useState(0)
  const [notifs,       setNotifs]       = useState([])
  const [notifsLoaded, setNotifsLoaded] = useState(false)

  const bellRef = useRef(null)
  const userRef = useRef(null)

  // ── Fermer menus sur clic extérieur ──────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!bellRef.current?.contains(e.target)) setBellOpen(false)
      if (!userRef.current?.contains(e.target)) setUserMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Polling messages non lus ──────────────────────────────────
  useEffect(() => {
    if (!user) { setUnread(0); setNotifs([]); return }

    const fetchAll = async () => {
      try {
        // Messages non lus
        const resUnread = await authFetch(`${API}/api/messages/unread/count`, { })
        const dataUnread = await resUnread.json()
        if (dataUnread.success) setUnread(dataUnread.count)
      } catch {}

      try {
        // Notifications complètes (réservations + messages)
        const resNotifs = await authFetch(`${API}/api/notifications`, { })
        const dataNotifs = await resNotifs.json()
        if (dataNotifs.success) {
          setNotifs(dataNotifs.notifications)
          setNotifsLoaded(true)
        }
      } catch {}
    }

    fetchAll()
    const iv = setInterval(fetchAll, 30000)  // rafraîchit toutes les 30s
    return () => clearInterval(iv)
  }, [user, pathname])

  // ── Ouvrir/fermer la cloche (notifications déjà chargées) ──────
  const openBell = () => {
    setBellOpen(v => !v)
    setUserMenu(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMobileOpen(false)
    setUserMenu(false)
  }

  const NAV = [
    { key: 'carpooling', to: '/search', label: 'Covoiturage', icon: '🚗', active: pathname.startsWith('/search') },
    { key: 'bus',        to: '/search', label: 'Bus',          icon: '🚌', active: false, badge: true },
    { key: 'train',      to: '/search', label: 'Train',         icon: '🚆', active: false, badge: true },
  ]

  // Badge = messages non lus + réservations en attente
  const totalNotifs = unread + notifs.filter(n => n.type === 'booking_pending').length

  return (
    <>
      <style>{`
        @keyframes ddIn   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bellIn { from{opacity:0;transform:translateY(-10px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideD { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ring   { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)} 60%{transform:rotate(-10deg)} 80%{transform:rotate(8deg)} }

        .cvg-nav { position:fixed; top:0; left:0; right:0; z-index:200; height:72px; background:#fff; border-bottom:1px solid rgba(0,0,0,0.07); font-family:'Plus Jakarta Sans',sans-serif; }
        .cvg-nav-inner { max-width:1200px; margin:0 auto; padding:0 28px; height:100%; display:flex; align-items:center; }
        .nav-logo { display:flex; align-items:center; gap:9px; margin-right:44px; flex-shrink:0; text-decoration:none; }
        .nav-logo-icon { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#1A9E8A,#22C6AD); display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 4px 14px rgba(26,158,138,0.35); }
        .nav-logo-text { font-weight:800; font-size:20px; color:#1A1A1A; letter-spacing:-0.04em; }
        .nav-logo-text span { color:#1A9E8A; }
        .nav-links { display:flex; align-items:stretch; gap:0; flex:1; height:100%; }
        .nav-item { position:relative; display:flex; align-items:center; gap:7px; padding:0 18px; font-size:15px; font-weight:700; color:#444; text-decoration:none; transition:color .18s; border-bottom:3px solid transparent; box-sizing:border-box; white-space:nowrap; }
        .nav-item:hover { color:#1A9E8A; }
        .nav-item.act { color:#1A9E8A; border-bottom-color:#1A9E8A; }
        .nav-item-icon { font-size:16px; }
        .nav-badge { background:#FF6B35; color:#fff; font-size:8px; font-weight:800; letter-spacing:.04em; padding:2px 5px; border-radius:4px; line-height:1.2; position:absolute; top:12px; right:6px; white-space:nowrap; }
        .nav-right { display:flex; align-items:center; gap:8px; margin-left:auto; }
        .nav-icon-btn { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:17px; color:#555; transition:background .18s; }
        .nav-icon-btn:hover { background:rgba(0,0,0,0.06); }
        .nav-propose-btn { padding:9px 20px; border-radius:22px; border:1.5px solid #1A1A1A; background:#fff; font-size:14px; font-weight:700; color:#1A1A1A; cursor:pointer; font-family:inherit; transition:all .18s; white-space:nowrap; }
        .nav-propose-btn:hover { background:#1A1A1A; color:#fff; }
        .lang-btn { width:36px; height:36px; border-radius:50%; border:1.5px solid rgba(0,0,0,0.14); background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:18px; transition:border-color .18s,transform .18s; flex-shrink:0; }
        .lang-btn:hover { border-color:#1A9E8A; transform:scale(1.08); }

        /* ── Avatar ── */
        .nav-user-wrap { position:relative; }
        .nav-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; color:#fff; background:linear-gradient(135deg,#1A9E8A,#22C6AD); cursor:pointer; border:2px solid transparent; transition:border-color .18s; }
        .nav-avatar:hover { border-color:#1A9E8A; }
        .nav-guest-icon { width:38px; height:38px; border-radius:50%; border:1.5px solid rgba(0,0,0,0.18); background:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer; transition:border-color .18s; }
        .nav-guest-icon:hover { border-color:#1A9E8A; }

        /* ── Dropdown user ── */
        .nav-dropdown { position:absolute; top:calc(100% + 4px); right:0; padding-top:0; min-width:220px; background:#fff; border:1px solid rgba(0,0,0,0.09); border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.12); overflow:hidden; animation:ddIn .18s ease both; z-index:300; }
        .nav-dd-item { display:flex; align-items:center; gap:10px; padding:12px 16px; font-size:14px; font-weight:600; color:#333; cursor:pointer; transition:background .15s; text-decoration:none; }
        .nav-dd-item:hover { background:rgba(26,158,138,0.06); color:#1A9E8A; }
        .nav-dd-sep { height:1px; background:rgba(0,0,0,0.07); margin:4px 0; }

        /* ── Cloche ── */
        .bell-wrap { position:relative; }
        .bell-btn { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; font-size:19px; transition:background .18s; position:relative; }
        .bell-btn:hover { background:rgba(0,0,0,0.06); }
        .bell-btn.has-notifs { animation: ring 1s ease .5s; }
        .bell-count { position:absolute; top:-2px; right:-2px; min-width:17px; height:17px; border-radius:999px; background:#EF4444; border:2px solid #fff; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; color:#fff; padding:0 3px; }

        /* ── Panel notifications ── */
        .bell-panel { position:absolute; top:calc(100% + 8px); right:0; width:340px; max-width:calc(100vw - 24px); background:#fff; border:1px solid rgba(0,0,0,0.09); border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,0.14); z-index:300; overflow:hidden; animation:bellIn .2s ease both; }
        .notif-item { display:flex; gap:12px; padding:13px 16px; cursor:pointer; transition:background .15s; border-bottom:1px solid rgba(0,0,0,0.05); text-decoration:none; }
        .notif-item:hover { background:rgba(26,158,138,0.04); }
        .notif-item:last-child { border-bottom:none; }

        /* ── Mobile ── */
        .hamburger { display:none; flex-direction:column; gap:5px; background:none; border:none; padding:6px; cursor:pointer; }
        .mobile-panel { position:absolute; top:72px; left:0; right:0; background:#fff; border-bottom:1px solid rgba(0,0,0,0.08); padding:16px 20px 22px; box-shadow:0 12px 40px rgba(0,0,0,0.10); animation:slideD .2s ease both; }
        @media(max-width:820px) { .nav-links,.nav-propose-btn { display:none !important; } .hamburger { display:flex !important; } .nav-logo { margin-right:auto; } .cvg-nav-inner { padding:0 18px; } }
        @media(min-width:821px) { .hamburger,.mobile-panel { display:none !important; } }
      `}</style>

      <nav className="cvg-nav">
        <div className="cvg-nav-inner">

          {/* Logo */}
          <Link to="/" className="nav-logo">
            <div className="nav-logo-icon">🚗</div>
            <span className="nav-logo-text">Clan<span>do</span></span>
          </Link>

          {/* Liens desktop */}
          <div className="nav-links">
            {NAV.map(item => (
              <Link key={item.key} to={item.to} className={`nav-item${item.active?' act':''}`}>
                {item.badge && <span className="nav-badge">BIENTÔT</span>}
                <span className="nav-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Droite */}
          <div className="nav-right">
            <button className="nav-icon-btn" onClick={() => navigate('/search')}>🔍</button>
            <Link to="/publish">
              <button className="nav-propose-btn">{t.nav.propose}</button>
            </Link>
            <button className="lang-btn" onClick={toggleLang} title={lang==='fr'?'Switch to English':'Passer en français'}>
              {lang==='fr'?'🇫🇷':'🇬🇧'}
            </button>

            {/* ══ Cloche notifications ══ */}
            {user && (
              <div className="bell-wrap" ref={bellRef}>
                <button className={`bell-btn${totalNotifs>0?' has-notifs':''}`} onClick={openBell} title="Notifications">
                  🔔
                  {totalNotifs > 0 && (
                    <span className="bell-count">{totalNotifs > 9 ? '9+' : totalNotifs}</span>
                  )}
                </button>

                {bellOpen && (
                  <div className="bell-panel">
                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(0,0,0,.07)' }}>
                      <div style={{ fontWeight:800, fontSize:15, color:'#1A1A1A' }}>Notifications</div>
                      {totalNotifs > 0 && (
                        <span style={{ background:'#EF4444', color:'#fff', borderRadius:10, padding:'2px 8px', fontSize:11, fontWeight:800 }}>{totalNotifs} nouvelles</span>
                      )}
                    </div>

                    {/* Liste */}
                    <div style={{ maxHeight:380, overflowY:'auto' }}>
                      {!notifsLoaded && (
                        <div style={{ padding:'30px', textAlign:'center', color:'#aaa', fontSize:13 }}>Chargement…</div>
                      )}
                      {notifsLoaded && notifs.length === 0 && (
                        <div style={{ padding:'36px 20px', textAlign:'center' }}>
                          <div style={{ fontSize:36, marginBottom:10 }}>🔕</div>
                          <div style={{ fontSize:13, color:'#aaa', fontWeight:600 }}>Aucune notification</div>
                        </div>
                      )}
                      {notifs.map(n => (
                        <Link key={n.id} to={n.link} className="notif-item"
                          onClick={() => setBellOpen(false)}>
                          {/* Icône */}
                          <div style={{ width:38, height:38, borderRadius:12, background:`${n.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                            {n.icon}
                          </div>
                          {/* Texte */}
                          <div style={{ minWidth:0, flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:'#1A1A1A', marginBottom:2 }}>{n.title}</div>
                            <div style={{ fontSize:12, color:'#888', lineHeight:1.45, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{n.body}</div>
                            <div style={{ fontSize:11, color:'#bbb', marginTop:4, fontWeight:600 }}>{relTime(n.at)}</div>
                          </div>
                          {/* Point non lu */}
                          <div style={{ width:8, height:8, borderRadius:'50%', background:n.color, flexShrink:0, marginTop:4 }}/>
                        </Link>
                      ))}
                    </div>

                    {/* Footer */}
                    <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(0,0,0,.06)', display:'flex', gap:8 }}>
                      <Link to="/messages" onClick={()=>setBellOpen(false)}
                        style={{ flex:1, background:'#F7F5F2', border:'none', borderRadius:9, padding:'8px', fontSize:12, fontWeight:700, color:'#555', cursor:'pointer', fontFamily:'inherit', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        💬 Messages {unread>0&&<span style={{ background:'#1A9E8A', color:'#fff', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900 }}>{unread}</span>}
                      </Link>
                      <Link to="/my-trips" onClick={()=>setBellOpen(false)}
                        style={{ flex:1, background:'#F7F5F2', border:'none', borderRadius:9, padding:'8px', fontSize:12, fontWeight:700, color:'#555', cursor:'pointer', fontFamily:'inherit', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        🎫 Mes trajets
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ Avatar utilisateur ══ */}
            <div className="nav-user-wrap" ref={userRef}>
              {user ? (
                <>
                  <div style={{ position:'relative' }}>
                    <div className="nav-avatar" onClick={() => { setUserMenu(v=>!v); setBellOpen(false) }}
                      style={{ overflow: 'hidden', padding: 0 }}>
                      {user.avatarUrl
                        ? <img
                            src={user.avatarUrl.startsWith('http')
                              ? user.avatarUrl
                              : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.avatarUrl}`
                            }
                            alt={user.name}
                            style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
                            onError={e => { e.target.style.display='none'; e.target.parentNode.textContent = user.name?.[0]?.toUpperCase()||'U' }}
                          />
                        : (user.name?.[0]?.toUpperCase() || 'U')
                      }
                    </div>
                  </div>

                  {userMenu && (
                    <div className="nav-dropdown">
                      <div style={{ padding:'12px 16px 10px', borderBottom:'1px solid rgba(0,0,0,.07)' }}>
                        <div style={{ fontWeight:800, fontSize:14, color:'#1A1A1A' }}>{user.name}</div>
                        <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{user.email}</div>
                      </div>
                      <Link to="/profile"  className="nav-dd-item" onClick={()=>setUserMenu(false)}>👤 {t.nav.profile}</Link>
                      <Link to="/my-trips" className="nav-dd-item" onClick={()=>setUserMenu(false)}>🎫 Mes trajets</Link>
                      <Link to="/messages" className="nav-dd-item" onClick={()=>setUserMenu(false)}>
                        💬 {t.nav.messages}
                        {unread > 0 && (
                          <span style={{ marginLeft:'auto', background:'#1A9E8A', color:'#fff', borderRadius:20, fontSize:10, fontWeight:800, padding:'2px 7px' }}>{unread}</span>
                        )}
                      </Link>
                      <Link to="/alerts" className="nav-dd-item" onClick={()=>setUserMenu(false)}>
                        🔔 Alertes & Favoris
                        {notifs.filter(n => n.type === 'alert').length > 0 && (
                          <span style={{ marginLeft:'auto', background:'#FF6B35', color:'#fff', borderRadius:20, fontSize:10, fontWeight:800, padding:'2px 7px' }}>
                            {notifs.filter(n => n.type === 'alert').length}
                          </span>
                        )}
                      </Link>
                      {user?.is_admin && (
                        <Link to="/admin" className="nav-dd-item" onClick={()=>setUserMenu(false)} style={{ color:'#7C3AED' }}>🛡️ Administration</Link>
                      )}
                      <div className="nav-dd-sep"/>
                      <div className="nav-dd-item" style={{ color:'#e53935' }} onClick={handleLogout}>🚪 {t.nav.logout}</div>
                    </div>
                  )}
                </>
              ) : (
                <Link to="/login">
                  <div className="nav-guest-icon" title={t.nav.login}>👤</div>
                </Link>
              )}
            </div>

            {/* Hamburger mobile */}
            <button className="hamburger" onClick={()=>setMobileOpen(v=>!v)}>
              {[0,1,2].map(i=>(
                <span key={i} style={{ width:22, height:2, borderRadius:2, background:'#333', display:'block', transition:'all .2s',
                  transform: mobileOpen
                    ? i===0?'translateY(7px) rotate(45deg)':i===2?'translateY(-7px) rotate(-45deg)':'scaleX(0)'
                    : 'none',
                  opacity: mobileOpen&&i===1?0:1,
                }}/>
              ))}
            </button>
          </div>
        </div>

        {/* ══ Panel mobile ══ */}
        {mobileOpen && (
          <div className="mobile-panel">
            {NAV.map(item=>(
              <Link key={item.key} to={item.to} onClick={()=>setMobileOpen(false)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 0', fontSize:15, fontWeight:600, color:item.active?'#1A9E8A':'#333', textDecoration:'none', borderBottom:'1px solid rgba(0,0,0,.05)' }}>
                {item.badge && <span style={{ background:'#1A9E8A', color:'#fff', fontSize:8, fontWeight:800, padding:'2px 5px', borderRadius:4 }}>{t.nav.new}</span>}
                {t.nav[item.key]}
              </Link>
            ))}
            <Link to="/publish" onClick={()=>setMobileOpen(false)}
              style={{ display:'block', marginTop:14, background:'#1A9E8A', color:'#fff', borderRadius:12, padding:'12px', fontSize:14, fontWeight:800, textAlign:'center', textDecoration:'none' }}>
              {t.nav.propose}
            </Link>
            {user && (
              <>
                <Link to="/my-trips" onClick={()=>setMobileOpen(false)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 0', fontSize:14, fontWeight:600, color:'#333', textDecoration:'none', marginTop:8, borderTop:'1px solid rgba(0,0,0,.05)' }}>
                  🎫 Mes trajets
                </Link>
                <Link to="/messages" onClick={()=>setMobileOpen(false)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 0', fontSize:14, fontWeight:600, color:'#333', textDecoration:'none' }}>
                  💬 Messages {unread>0&&<span style={{ background:'#EF4444', color:'#fff', borderRadius:10, fontSize:10, padding:'1px 7px', fontWeight:800 }}>{unread}</span>}
                </Link>
                <Link to="/alerts" onClick={()=>setMobileOpen(false)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 0', fontSize:14, fontWeight:600, color:'#333', textDecoration:'none' }}>
                  🔔 Alertes & Favoris
                </Link>
                <button onClick={handleLogout}
                  style={{ width:'100%', marginTop:8, padding:'11px', background:'#FEF2F2', border:'1.5px solid rgba(239,68,68,.2)', borderRadius:10, color:'#DC2626', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  🚪 Déconnexion
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
