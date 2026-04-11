import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

import { API_URL, saveToken , authFetch } from '../utils/api'

// ── Icône Google ──────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// ── Icône Facebook ────────────────────────────
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

export default function Login() {
  const { login, fetchMe } = useAuth()
  const { t, lang }        = useLang()
  const navigate   = useNavigate()
  const [params]   = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null) // 'google' | 'facebook' | null

  const [needsVerif, setNeedsVerif] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  // ── Gérer le retour OAuth (?oauth=success&sid=xxx) ──
  useEffect(() => {
    const oauthStatus = params.get('oauth')
    const oauthError  = params.get('error')
    const sid         = params.get('sid')

    if (oauthStatus === 'success') {
      if (sid) {
        // Cross-domain : valider la session via le sid
        fetch(`${API_URL}/api/auth/oauth-session`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              if (data.token) saveToken(data.token)
              window.history.replaceState({}, '', '/')
              navigate('/')
            } else {
              setError(lang === 'fr' ? 'Connexion OAuth échouée.' : 'OAuth login failed.')
            }
          })
          .catch(() => setError(lang === 'fr' ? 'Erreur serveur.' : 'Server error.'))
      } else {
        // Même domaine : fetchMe classique
        fetchMe().then(user => {
          if (user) navigate('/')
          else setError(lang === 'fr' ? 'Connexion OAuth échouée.' : 'OAuth login failed.')
        })
      }
      return
    }

    if (oauthError === 'google')   setError(lang === 'fr' ? 'Connexion Google annulée ou échouée.' : 'Google login cancelled or failed.')
    if (oauthError === 'facebook') setError(lang === 'fr' ? 'Connexion Facebook annulée ou échouée.' : 'Facebook login cancelled or failed.')
    if (oauthError === 'session')  setError(lang === 'fr' ? 'Erreur de session. Réessayez.' : 'Session error. Please try again.')
  }, [params])

  // ── Connexion email/mot de passe ──────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNeedsVerif(false)
    if (!email || !password) {
      setError(lang === 'fr' ? 'Veuillez remplir tous les champs.' : 'Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.success) {
        navigate('/')
      } else if (data.blocked) {
        navigate('/account-blocked', { state: { email: data.email || email } })
      } else if (data.needsVerification) {
        setNeedsVerif(true)
      } else {
        setError(data.message || (lang === 'fr' ? 'Email ou mot de passe incorrect.' : 'Incorrect email or password.'))
      }
    } catch {
      setError(lang === 'fr' ? 'Impossible de contacter le serveur.' : 'Cannot reach server.')
    } finally {
      setLoading(false)
    }
  }

  // ── Connexion OAuth ───────────────────────────
  const handleOAuth = (provider) => {
    setOauthLoading(provider)
    setError('')
    window.location.href = `${API_URL}/api/auth/${provider}`
  }

  const handleResend = async () => {
    try {
      await authFetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendSent(true)
    } catch {}
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .login-wrap  { animation: fadeUp 0.65s ease both; }
        .social-btn {
          background:#fff; border:1.5px solid rgba(0,0,0,0.13); border-radius:11px;
          color:#1A1A1A; font-family:'Plus Jakarta Sans',sans-serif;
          font-size:14px; font-weight:600; padding:12px 10px; cursor:pointer;
          transition:all .2s; display:flex; align-items:center; justify-content:center; gap:9px;
          position:relative;
        }
        .social-btn:hover:not(:disabled) {
          border-color:rgba(26,158,138,.4);
          background:#f0fdf8;
          transform:translateY(-1px);
          box-shadow:0 4px 14px rgba(26,158,138,.12);
        }
        .social-btn:disabled { opacity:.6; cursor:not-allowed; }
        .social-btn.google:hover:not(:disabled)   { border-color:rgba(66,133,244,.4); background:#f0f4ff; }
        .social-btn.facebook:hover:not(:disabled) { border-color:rgba(24,119,242,.4); background:#f0f4ff; }
        .divider { display:flex; align-items:center; gap:14px; margin:18px 0; }
        .divider::before,.divider::after { content:''; flex:1; height:1px; background:rgba(0,0,0,0.1); }
        @media(min-width:900px) { .login-side { display:flex !important; } }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 72px)', display:'flex', background:'linear-gradient(160deg,#f0fdf8 0%,#fafaf7 50%,#fff8f5 100%)' }}>

        {/* ── Panneau décoratif gauche ── */}
        <div className="login-side" style={{ display:'none', flex:'0 0 42%', background:'linear-gradient(160deg,#1A9E8A 0%,#157A6B 100%)', padding:'60px 52px', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:320, height:320, borderRadius:'50%', border:'1px solid rgba(255,255,255,.12)', top:'-10%', right:'-8%' }} />
          <div style={{ position:'absolute', width:200, height:200, borderRadius:'50%', border:'1px solid rgba(255,255,255,.08)', top:'8%', right:'2%' }} />
          <div style={{ position:'absolute', width:280, height:280, borderRadius:'50%', background:'rgba(255,255,255,.05)', bottom:'-8%', left:'-8%' }} />
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, position:'relative', zIndex:1 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🚗</div>
            <span style={{ fontWeight:800, fontSize:19, color:'#fff', letterSpacing:'-.03em' }}>Clando</span>
          </Link>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:52, marginBottom:24 }}>🚗</div>
            <h2 style={{ fontSize:30, fontWeight:800, color:'#fff', lineHeight:1.2, letterSpacing:'-.03em', marginBottom:14 }}>
              {lang === 'fr' ? 'Bon retour parmi nous !' : 'Welcome back!'}
            </h2>
            <p style={{ color:'rgba(255,255,255,.75)', fontSize:15, lineHeight:1.8 }}>
              {lang === 'fr' ? 'Des milliers de trajets vous attendent.' : 'Thousands of rides are waiting for you.'}
            </p>
          </div>
          <div style={{ position:'relative', zIndex:1, background:'rgba(255,255,255,.1)', borderRadius:14, padding:'16px 20px' }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', marginBottom:8 }}>
              {lang === 'fr' ? 'Déjà avec nous' : 'Already with us'}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:-6 }}>
              {['M','S','J','A','C'].map((a,i) => (
                <div key={i} style={{ width:32, height:32, borderRadius:'50%', background:`hsl(${i*60+160},45%,52%)`, border:'2px solid rgba(255,255,255,.8)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'#fff', marginLeft: i > 0 ? -8 : 0 }}>{a}</div>
              ))}
              <span style={{ marginLeft:12, fontSize:13, color:'rgba(255,255,255,.8)', fontWeight:600 }}>+28M {lang === 'fr' ? 'membres' : 'members'}</span>
            </div>
          </div>
        </div>

        {/* ── Formulaire ── */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px' }}>
          <div className="login-wrap" style={{ width:'100%', maxWidth:420 }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:6, color:'#1A1A1A' }}>
                {t.auth.loginTitle}
              </h1>
              <p style={{ color:'#888', fontSize:14 }}>{t.auth.loginSub}</p>
            </div>

            {/* ── Bannière email non vérifié ── */}
            {needsVerif && (
              <div style={{ background:'#fffbeb', border:'1.5px solid rgba(245,158,11,.3)', borderRadius:14, padding:'16px 18px', marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'#92400e', marginBottom:6 }}>📧 {lang === 'fr' ? 'Email non vérifié' : 'Email not verified'}</div>
                <p style={{ fontSize:13, color:'#78350f', lineHeight:1.6, marginBottom:10 }}>
                  {lang === 'fr' ? 'Vérifiez votre boîte mail ou renvoyez un email.' : 'Check your inbox or resend the email.'}
                </p>
                {resendSent ? (
                  <div style={{ fontSize:13, color:'#166534', fontWeight:600 }}>✅ {lang === 'fr' ? 'Email renvoyé !' : 'Email resent!'}</div>
                ) : (
                  <button type="button"
                    style={{ background:'#f59e0b', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                    onClick={handleResend}>
                    {lang === 'fr' ? 'Renvoyer l\'email' : 'Resend email'}
                  </button>
                )}
              </div>
            )}

            {/* ── Boutons OAuth ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4 }}>

              {/* Google */}
              <button
                className="social-btn google"
                disabled={!!oauthLoading}
                onClick={() => handleOAuth('google')}>
                {oauthLoading === 'google' ? (
                  <span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(66,133,244,.3)', borderTopColor:'#4285f4', display:'inline-block', animation:'spin .8s linear infinite' }} />
                ) : <GoogleIcon />}
                Google
              </button>

              {/* Facebook */}
              <button
                className="social-btn facebook"
                disabled={!!oauthLoading}
                onClick={() => handleOAuth('facebook')}>
                {oauthLoading === 'facebook' ? (
                  <span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(24,119,242,.3)', borderTopColor:'#1877f2', display:'inline-block', animation:'spin .8s linear infinite' }} />
                ) : <FacebookIcon />}
                Facebook
              </button>
            </div>

            <div className="divider">
              <span style={{ color:'#bbb', fontSize:12, fontWeight:500 }}>
                {lang === 'fr' ? 'ou par email' : 'or with email'}
              </span>
            </div>

            {/* ── Formulaire email/pwd ── */}
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ fontSize:13, fontWeight:700, color:'#666', display:'block', marginBottom:7 }}>{t.auth.email}</label>
                <input className="form-input" type="email" style={{ padding:'13px 14px' }}
                  placeholder={lang === 'fr' ? 'vous@exemple.fr' : 'you@example.com'}
                  value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                  <label style={{ fontSize:13, fontWeight:700, color:'#666' }}>{t.auth.password}</label>
                  <Link to="/forgot-password" style={{ fontSize:12, color:'#1A9E8A', fontWeight:600 }}>{t.auth.forgotPwd}</Link>
                </div>
                <div style={{ position:'relative' }}>
                  <input className="form-input" type={showPwd ? 'text' : 'password'} style={{ padding:'13px 44px 13px 14px' }}
                    placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                  <button type="button"
                    style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#aaa', fontSize:16 }}
                    onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background:'#fef2f2', border:'1.5px solid rgba(239,68,68,.2)', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#dc2626' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ padding:'14px', fontSize:15, borderRadius:12, marginTop:4 }} disabled={loading}>
                {loading ? (
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <span style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', display:'inline-block', animation:'spin .8s linear infinite' }} />
                    {lang === 'fr' ? 'Connexion…' : 'Logging in…'}
                  </span>
                ) : `${t.auth.loginBtn} →`}
              </button>
            </form>

            <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'#999' }}>
              {t.auth.noAccount}{' '}
              <Link to="/register" style={{ color:'#1A9E8A', fontWeight:700 }}>{t.auth.createAccount}</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
