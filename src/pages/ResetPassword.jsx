import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'

import { API_URL , authFetch } from '../utils/api'

export default function ResetPassword() {
  const [params]  = useSearchParams()
  const { t } = useLang()
  const navigate = useNavigate()
  const token     = params.get('token')

  const [tokenStatus, setTokenStatus] = useState('checking') // checking | valid | invalid
  const [firstName, setFirstName]     = useState('')
  const [password,  setPassword]      = useState('')
  const [confirm,   setConfirm]       = useState('')
  const [showPwd,   setShowPwd]       = useState(false)
  const [status,    setStatus]        = useState('idle') // idle | loading | success | error
  const [message,   setMessage]       = useState('')

  // Vérif du token au chargement
  useEffect(() => {
    if (!token) { setTokenStatus('invalid'); return }
    fetch(`${API_URL}/api/auth/check-reset-token?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) { setTokenStatus('valid'); setFirstName(data.firstName || '') }
        else setTokenStatus('invalid')
      })
      .catch(() => setTokenStatus('invalid'))
  }, [token])

  // Force password strength
  const strength = () => {
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }
  const strColor  = ['#ef4444','#f97316','#eab308','#22c55e']
  const strLabel  = ['','Faible','Moyen','Bon','Fort']
  const strBar    = strength()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setStatus('error'); setMessage('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)  { setStatus('error'); setMessage('Minimum 8 caractères.'); return }

    setStatus('loading')
    try {
      const res  = await authFetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        setTimeout(() => navigate('/login'), 3000)
      } else {
        setStatus('error')
        setMessage(data.message)
        if (data.expired) setTokenStatus('invalid')
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
        @keyframes progress { from{width:0} to{width:100%} }
        .rp-wrap { animation: fadeUp .5s ease both; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 68px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 24px', background:'linear-gradient(160deg,#fff8f5 0%,#fafaf7 60%)' }}>
        <div className="rp-wrap" style={{ width:'100%', maxWidth:420 }}>

          {/* Checking token */}
          {tokenStatus === 'checking' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:'50%', border:'3px solid var(--teal-light)', borderTopColor:'var(--teal)', animation:'spin .9s linear infinite', margin:'0 auto 20px' }} />
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>Vérification du lien…</p>
            </div>
          )}

          {/* Invalid / expired token */}
          {tokenStatus === 'invalid' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ animation:'popIn .5s ease both', width:80, height:80, borderRadius:'50%', background:'var(--orange-light)', border:'1.5px solid rgba(255,107,53,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:36 }}>⏱</div>
              <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.02em', marginBottom:10 }}>Lien expiré ou invalide</h2>
              <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7, maxWidth:340, margin:'0 auto 28px' }}>
                Ce lien de réinitialisation est invalide ou a expiré (validité 1 heure). Faites une nouvelle demande.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <Link to="/forgot-password">
                  <button className="btn-primary" style={{ padding:'12px 24px', fontSize:14 }}>Nouvelle demande</button>
                </Link>
                <Link to="/login">
                  <button className="btn-outline" style={{ padding:'12px 24px', fontSize:14 }}>Se connecter</button>
                </Link>
              </div>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ animation:'popIn .5s ease both', width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:38, boxShadow:'0 12px 32px rgba(26,158,138,.3)' }}>✅</div>
              <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:10 }}>Mot de passe mis à jour !</h1>
              <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7, marginBottom:10 }}>
                Votre nouveau mot de passe a été enregistré.
              </p>
              <p style={{ color:'var(--text-dim)', fontSize:13, marginBottom:24 }}>Redirection vers la connexion dans 3 secondes…</p>
              <div style={{ height:3, background:'var(--teal-light)', borderRadius:2, overflow:'hidden', maxWidth:200, margin:'0 auto 24px' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,var(--teal),#22C6AD)', animation:'progress 3s linear forwards' }} />
              </div>
              <Link to="/login">
                <button className="btn-primary" style={{ padding:'12px 24px', fontSize:14 }}>Se connecter →</button>
              </Link>
            </div>
          )}

          {/* Form */}
          {tokenStatus === 'valid' && status !== 'success' && (
            <>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <div style={{ fontSize:40, marginBottom:14 }}>🔒</div>
                <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-.03em', marginBottom:8 }}>
                  {firstName ? `Bonjour ${firstName} !` : 'Nouveau mot de passe'}
                </h1>
                <p style={{ color:'var(--text-muted)', fontSize:14 }}>
                  Choisissez un nouveau mot de passe sécurisé.
                </p>
              </div>

              <div style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:20, padding:'28px', boxShadow:'var(--shadow-sm)' }}>
                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

                  {/* New password */}
                  <div>
                    <label style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7 }}>
                      Nouveau mot de passe
                    </label>
                    <div style={{ position:'relative' }}>
                      <input type={showPwd ? 'text' : 'password'} className="form-input"
                        style={{ padding:'13px 44px 13px 14px' }}
                        placeholder="Min. 8 caractères, 1 majuscule, 1 chiffre"
                        value={password} onChange={e => setPassword(e.target.value)} required />
                      <button type="button" style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:16 }}
                        onClick={() => setShowPwd(v => !v)}>
                        {showPwd ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {password && (
                      <div style={{ marginTop:8 }}>
                        <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                          {[1,2,3,4].map(n => (
                            <div key={n} style={{ flex:1, height:3, borderRadius:2, background:n<=strBar ? strColor[strBar-1] : 'var(--border-strong)', transition:'background .25s' }} />
                          ))}
                        </div>
                        <span style={{ fontSize:11, color:strColor[strBar-1], fontWeight:700 }}>{strLabel[strBar]}</span>
                        <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4 }}>
                          {!/[A-Z]/.test(password) && <span>• Ajouter une majuscule </span>}
                          {!/[0-9]/.test(password) && <span>• Ajouter un chiffre </span>}
                          {!/[^A-Za-z0-9]/.test(password) && <span>• Un symbole renforcerait le mot de passe</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:7 }}>
                      Confirmer le mot de passe
                    </label>
                    <div style={{ position:'relative' }}>
                      <input type={showPwd ? 'text' : 'password'} className="form-input"
                        style={{ padding:'13px 44px 13px 14px', borderColor: confirm && password !== confirm ? '#ef4444' : '' }}
                        placeholder="Répétez votre mot de passe"
                        value={confirm} onChange={e => setConfirm(e.target.value)} required />
                      {confirm && (
                        <span style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>
                          {password === confirm ? '✅' : '❌'}
                        </span>
                      )}
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
                        Enregistrement…
                      </span>
                    ) : '🔒 Enregistrer le nouveau mot de passe'}
                  </button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
