import { useState } from 'react'
import { Link } from 'react-router-dom'

import { API_URL , authFetch } from '../utils/api'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState('idle') // idle | loading | sent | error
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res  = await authFetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('sent')
      } else {
        setStatus('error')
        setMessage(data.message)
      }
    } catch {
      setStatus('error')
      setMessage('Impossible de contacter le serveur.')
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes popIn  { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        .fp-wrap { animation: fadeUp .55s ease both; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 68px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px', background:'linear-gradient(160deg,#fff8f5 0%,#fafaf7 60%)' }}>
        <div className="fp-wrap" style={{ width:'100%', maxWidth:420 }}>

          {status === 'sent' ? (
            /* ── Succès ─────────────────────────── */
            <div style={{ textAlign:'center' }}>
              <div style={{ animation:'popIn .5s ease both', width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:38, boxShadow:'0 12px 32px rgba(26,158,138,.3)' }}>
                📧
              </div>
              <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:10 }}>Email envoyé !</h1>
              <p style={{ color:'var(--text-muted)', fontSize:15, lineHeight:1.75, marginBottom:10, maxWidth:360, margin:'0 auto 10px' }}>
                Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
              </p>
              <p style={{ color:'var(--text-dim)', fontSize:13, marginBottom:32 }}>
                Vérifiez aussi vos spams. Le lien expire dans <strong>1 heure</strong>.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button className="btn-ghost" style={{ fontSize:14, padding:'10px 4px' }} onClick={() => setStatus('idle')}>
                  ← Recommencer
                </button>
                <Link to="/login">
                  <button className="btn-primary" style={{ padding:'11px 24px', fontSize:14 }}>Se connecter</button>
                </Link>
              </div>
            </div>
          ) : (
            /* ── Formulaire ─────────────────────── */
            <>
              <div style={{ textAlign:'center', marginBottom:32 }}>
                <div style={{ fontSize:40, marginBottom:16 }}>🔑</div>
                <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:8 }}>Mot de passe oublié ?</h1>
                <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7, maxWidth:340, margin:'0 auto' }}>
                  Entrez votre adresse email et nous vous enverrons un lien pour choisir un nouveau mot de passe.
                </p>
              </div>

              <div style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:20, padding:'28px', boxShadow:'var(--shadow-sm)' }}>
                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7 }}>
                      Adresse email
                    </label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none' }}>📧</span>
                      <input type="email" className="form-input"
                        style={{ padding:'13px 13px 13px 40px' }}
                        placeholder="vous@exemple.fr"
                        value={email} onChange={e => setEmail(e.target.value)}
                        required autoFocus />
                    </div>
                  </div>

                  {status === 'error' && (
                    <div style={{ background:'#fef2f2', border:'1.5px solid rgba(239,68,68,.2)', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#dc2626' }}>
                      ⚠️ {message}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ padding:'14px', fontSize:15 }} disabled={status === 'loading'}>
                    {status === 'loading' ? (
                      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        <span style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', display:'inline-block', animation:'spin .8s linear infinite' }} />
                        Envoi en cours…
                      </span>
                    ) : 'Envoyer le lien de réinitialisation'}
                  </button>
                </form>
              </div>

              <p style={{ textAlign:'center', marginTop:20, fontSize:14, color:'var(--text-dim)' }}>
                <Link to="/login" style={{ color:'var(--teal)', fontWeight:700 }}>← Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
