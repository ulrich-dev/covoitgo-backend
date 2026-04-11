import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'

import { API_URL , authFetch } from '../utils/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const { t } = useLang()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const token = params.get('token')

  const [status, setStatus] = useState('loading') // loading | success | error | expired | notoken
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('notoken'); return }

    const verify = async () => {
      try {
        const res  = await authFetch(`${API_URL}/api/auth/verify-email?token=${token}`, { credentials: 'include' })
        const data = await res.json()

        if (data.success) {
          setUser(data.user)
          setStatus('success')
          // Redirige vers l'accueil après 2s
          setTimeout(() => navigate('/'), 2500)
        } else {
          setStatus(data.expired ? 'expired' : 'error')
          setMessage(data.message)
        }
      } catch {
        setStatus('error')
        setMessage('Impossible de contacter le serveur.')
      }
    }
    verify()
  }, [token])

  const handleResend = async (email) => {
    try {
      await authFetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      })
    } catch {}
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes popIn   { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progress{ from{width:0} to{width:100%} }
        .verify-wrap { animation: fadeUp .5s ease both; }
        .icon-circle { animation: popIn .6s .2s ease both; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 68px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px', background:'linear-gradient(160deg,#e8f7f4 0%,#fafaf7 60%)' }}>
        <div className="verify-wrap" style={{ width:'100%', maxWidth:440, textAlign:'center' }}>

          {/* Loading */}
          {status === 'loading' && (
            <div>
              <div style={{ width:72, height:72, borderRadius:'50%', background:'#fff', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', boxShadow:'var(--shadow-md)' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid var(--teal-light)', borderTopColor:'var(--teal)', animation:'spin .9s linear infinite' }} />
              </div>
              <h2 style={{ fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:'-.02em' }}>Vérification en cours…</h2>
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>Nous vérifions votre lien de confirmation.</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div>
              <div className="icon-circle" style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:38, boxShadow:'0 12px 36px rgba(26,158,138,.35)' }}>✅</div>
              <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-.03em', marginBottom:10 }}>Email vérifié !</h1>
              <p style={{ color:'var(--text-muted)', fontSize:15, lineHeight:1.7, marginBottom:28, maxWidth:340, margin:'0 auto 28px' }}>
                Votre compte est activé. Bienvenue sur Covoitgo 🎉<br />
                <span style={{ fontSize:13, color:'var(--text-dim)' }}>Redirection automatique dans 2 secondes…</span>
              </p>
              {/* Progress bar */}
              <div style={{ height:3, background:'var(--teal-light)', borderRadius:2, overflow:'hidden', maxWidth:240, margin:'0 auto 24px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,var(--teal),#22C6AD)', borderRadius:2, animation:'progress 2.5s linear forwards' }} />
              </div>
              <Link to="/">
                <button className="btn-primary" style={{ padding:'12px 28px', fontSize:15 }}>Accéder à l'accueil →</button>
              </Link>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div>
              <div className="icon-circle" style={{ width:80, height:80, borderRadius:'50%', background:'var(--orange-light)', border:'1.5px solid rgba(255,107,53,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:36, boxShadow:'var(--shadow-md)' }}>⏱</div>
              <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.02em', marginBottom:10 }}>Lien expiré</h2>
              <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7, maxWidth:360, margin:'0 auto 28px' }}>
                Ce lien de vérification a expiré (validité 24h). Entrez votre email pour en recevoir un nouveau.
              </p>
              <ResendForm onSend={handleResend} />
            </div>
          )}

          {/* Error / invalid */}
          {(status === 'error' || status === 'notoken') && (
            <div>
              <div className="icon-circle" style={{ width:80, height:80, borderRadius:'50%', background:'#fef2f2', border:'1.5px solid rgba(239,68,68,.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:36, boxShadow:'var(--shadow-md)' }}>❌</div>
              <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.02em', marginBottom:10 }}>Lien invalide</h2>
              <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7, maxWidth:360, margin:'0 auto 28px' }}>
                {message || 'Ce lien de vérification est invalide ou a déjà été utilisé.'}
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <Link to="/register"><button className="btn-outline" style={{ padding:'11px 22px', fontSize:14 }}>Créer un compte</button></Link>
                <Link to="/login"><button className="btn-primary" style={{ padding:'11px 22px', fontSize:14 }}>Se connecter</button></Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// Petit composant pour renvoyer le mail
function ResendForm({ onSend }) {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await onSend(email)
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div style={{ background:'var(--teal-light)', border:'1px solid rgba(26,158,138,.2)', borderRadius:12, padding:'16px 20px', maxWidth:340, margin:'0 auto' }}>
      <div style={{ fontWeight:700, color:'var(--teal-dark)', marginBottom:4 }}>✅ Email envoyé !</div>
      <div style={{ fontSize:13, color:'var(--teal-dark)' }}>Vérifiez votre boîte mail (et vos spams).</div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth:340, margin:'0 auto' }}>
      <div style={{ display:'flex', gap:8 }}>
        <input className="form-input" type="email" style={{ padding:'12px 14px', flex:1 }}
          placeholder="votre@email.fr" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button type="submit" className="btn-primary" style={{ padding:'12px 18px', fontSize:14, whiteSpace:'nowrap' }} disabled={loading}>
          {loading ? '…' : 'Renvoyer'}
        </button>
      </div>
    </form>
  )
}
