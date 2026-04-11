import { API_URL, authFetch } from '../utils/api'
import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import DriverDocs from '../components/DriverDocs'

const STEPS = [
  { label: 'Identité',  icon: '👤', color: '#1A9E8A', bg: '#E2F5F2' },
  { label: 'Accès',     icon: '🔐', color: '#7C3AED', bg: '#F3EEFF' },
  { label: 'Profil',    icon: '⚙️', color: '#FF6B35', bg: '#FFF0E8' },
  { label: 'Véhicule',  icon: '🚗', color: '#1A9E8A', bg: '#E2F5F2' },
]

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]               = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)

  const [form, setForm] = useState({
    firstName:'', lastName:'', birthDate:'', phone:'',
    email:'', password:'', confirmPassword:'',
    role:'both', bio:'', language:'en',
  })
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))

  // Photo de profil (optionnelle à l'inscription)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile,    setAvatarFile]    = useState(null)
  const avatarInputRef = useRef(null)

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const validateStep = () => {
    setError('')
    if (step===0) {
      if (!form.firstName||!form.lastName||!form.birthDate) { setError('Veuillez remplir tous les champs obligatoires.'); return false }
    }
    if (step===1) {
      if (!form.email||!form.password||!form.confirmPassword) { setError('Veuillez remplir tous les champs.'); return false }
      if (form.password.length<8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return false }
      if (!/[A-Z]/.test(form.password)) { setError('Le mot de passe doit contenir au moins une majuscule.'); return false }
      if (!/[0-9]/.test(form.password)) { setError('Le mot de passe doit contenir au moins un chiffre.'); return false }
      if (form.password!==form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return false }
    }
    return true
  }

  const next = () => { if (validateStep()) setStep(s=>s+1) }
  const prev = () => { setError(''); setStep(s=>s-1) }

  const [registered, setRegistered] = useState(false)
  const [regEmail,    setRegEmail]   = useState('')
  const [regUserId,   setRegUserId]  = useState(null) // pour le step véhicule

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validateStep()) return
    setLoading(true)
    try {
      const data = await register(form)
      if (data.success || data.needsVerification) {
        setRegEmail(form.email)

        // Connecter automatiquement l'utilisateur pour que l'étape véhicule ait un JWT
        if (data.success) {
          try {
            const loginResult = await login(form.email, form.password)
            if (!loginResult?.success) {
              console.warn('Auto-login après inscription échoué')
            }
            // Petit délai pour s'assurer que le JWT est bien sauvegardé
            await new Promise(r => setTimeout(r, 300))
          } catch (e) {
            console.warn('Auto-login error:', e)
          }
        }

        // Uploader la photo si l'utilisateur en a choisi une
        if (avatarFile && data.success) {
          try {
            const fd = new FormData()
            fd.append('avatar', avatarFile)
            await authFetch(`${API_URL}/api/auth/avatar`, {
              method: 'POST', credentials: 'include', body: fd,
            })
          } catch {} // non bloquant
        }

        // Si conducteur → afficher l'étape véhicule (step 3) avant la confirmation
        if (form.role === 'driver' || form.role === 'both') {
          setStep(3) // step véhicule
        } else {
          setRegistered(true)
        }
      } else {
        setError(data.message || 'Erreur lors de la création du compte.')
        setLoading(false)
      }
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez que le backend est lancé.')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  // Ecran de confirmation après inscription
  if (registered) {
    return (
      <>
        <style>{`@keyframes popIn{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{ minHeight:'calc(100vh - 68px)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:0, padding:'48px 24px', textAlign:'center', background:'linear-gradient(160deg,#e8f7f4 0%,#fafaf7 60%)' }}>
          <div style={{ animation:'popIn .6s ease both' }}>
            <div style={{ width:84, height:84, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, margin:'0 auto 24px', boxShadow:'0 12px 36px rgba(26,158,138,.35)' }}>📧</div>
            <h1 style={{ fontSize:'clamp(24px,4vw,34px)', fontWeight:800, letterSpacing:'-.03em', marginBottom:10 }}>Vérifiez votre email !</h1>
            <p style={{ color:'var(--text-muted)', fontSize:15, lineHeight:1.75, maxWidth:400, margin:'0 auto 6px' }}>
              Un email de confirmation a été envoyé à
            </p>
            <p style={{ fontWeight:800, fontSize:16, color:'var(--teal)', marginBottom:24 }}>{regEmail}</p>
            <div style={{ background:'#fff', border:'1.5px solid var(--border)', borderRadius:14, padding:'16px 20px', maxWidth:380, margin:'0 auto 28px', textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Comment ça marche</div>
              {[
                ['1', 'Ouvrez l\'email que vous venez de recevoir'],
                ['2', 'Cliquez sur le bouton "Vérifier mon email"'],
                ['3', 'Vous serez automatiquement connecté !'],
              ].map(([n, t]) => (
                <div key={n} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--teal-light)', color:'var(--teal-dark)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{n}</div>
                  <span style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>{t}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize:13, color:'var(--text-dim)', marginBottom:12 }}>Vous n'avez pas reçu l'email ?</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <Link to="/login"><button className="btn-ghost" style={{ fontSize:14, padding:'10px 4px' }}>Se connecter</button></Link>
              <button className="btn-outline" style={{ padding:'11px 20px', fontSize:14 }}
                onClick={() => {
                  fetch(`${API_URL}/api/auth/resend-verification`, {
                    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email: regEmail })
                  })
                  alert('Email renvoyé ! Vérifiez votre boîte mail (et les spams).')
                }}>
                Renvoyer l'email
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const pwStrength = () => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length>=8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strengthColors = ['#EF4444','#F97316','#F59E0B','#10B981']
  const strengthLabels = ['Faible','Moyen','Bon','Fort']
  const sw = pwStrength()

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .reg-card   { animation: fadeUp .7s ease both; }
        .step-body  { animation: slideIn .4s ease both; }
        .form-label { font-size:13px; font-weight:600; color:#1C1917; margin-bottom:7px; display:block; }
        .eye-btn    { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:15px; }
        .role-btn   { flex:1; padding:14px 8px; border-radius:12px; border:1.5px solid rgba(26,25,23,0.09); background:#FAFAF7; cursor:pointer; text-align:center; transition:all .2s; font-family:'Plus Jakarta Sans',sans-serif; }
        .role-btn.active { border-color:#1A9E8A; background:#E2F5F2; }
        .role-btn:hover:not(.active) { border-color:rgba(26,25,23,0.2); background:#fff; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 68px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', background:'linear-gradient(160deg,#F0FDF9 0%,#FAFAF7 60%,#FFF5EE 100%)', position:'relative', overflow:'hidden' }}>
        {/* Background orbs */}
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(26,158,138,0.14) 0%,transparent 70%)', filter:'blur(60px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-5%', left:'-5%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,107,53,0.11) 0%,transparent 70%)', filter:'blur(50px)', pointerEvents:'none' }} />

        <div className="reg-card" style={{ width:'100%', maxWidth:500, position:'relative', zIndex:1 }}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:22 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 4px 12px rgba(26,158,138,0.28)' }}>🚗</div>
              <span style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.02em', color:'#1C1917' }}>Clando</span>
            </Link>
            <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.03em', color:'#1C1917', marginBottom:6 }}>Créer mon compte 🎉</h1>
            <p style={{ fontSize:14.5, color:'#6B6560' }}>Rejoignez des millions de covoitureurs</p>
          </div>

          {/* Stepper */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:0, marginBottom:36, padding:'0 4px' }}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
                {i>0 && (
                  <div style={{ position:'absolute', left:'-50%', top:14, width:'100%', height:2.5, background:i<=step?'linear-gradient(90deg,#1A9E8A,#22C6AD)':'rgba(26,25,23,0.1)', borderRadius:2, zIndex:0, transition:'background .4s' }} />
                )}
                <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, zIndex:1, transition:'all .3s', background:i<step?'#1A9E8A':i===step?'linear-gradient(135deg,#1A9E8A,#22C6AD)':'#fff', border:i===step?'2.5px solid rgba(26,158,138,0.3)':'2px solid rgba(26,25,23,0.12)', color:i<=step?'#fff':'#A8A39E', boxShadow:i===step?'0 0 0 5px rgba(26,158,138,0.12)':'none' }}>
                  {i<step?'✓':i+1}
                </div>
                <span style={{ fontSize:11.5, fontWeight:600, marginTop:7, color:i<=step?'#1A9E8A':'#A8A39E', transition:'color .3s' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className="card" style={{ padding:28, marginBottom:16 }}>
            <form onSubmit={handleSubmit}>

              {/* STEP 0 */}
              {step===0 && (
                <div className="step-body" style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                      <label className="form-label">Prénom <span style={{ color:'#EF4444' }}>*</span></label>
                      <input className="form-input" style={{ padding:'13px 14px' }} placeholder="Jean" value={form.firstName} onChange={set('firstName')} />
                    </div>
                    <div>
                      <label className="form-label">Nom <span style={{ color:'#EF4444' }}>*</span></label>
                      <input className="form-input" style={{ padding:'13px 14px' }} placeholder="Dupont" value={form.lastName} onChange={set('lastName')} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Date de naissance <span style={{ color:'#EF4444' }}>*</span></label>
                    <input type="date" className="form-input" style={{ padding:'13px 14px' }} value={form.birthDate} onChange={set('birthDate')} />
                  </div>
                  <div>
                    <label className="form-label">Téléphone <span style={{ color:'#A8A39E', fontWeight:400 }}>(optionnel)</span></label>
                    <input type="tel" className="form-input" style={{ padding:'13px 14px' }} placeholder="+33 6 00 00 00 00" value={form.phone} onChange={set('phone')} />
                  </div>
                </div>
              )}

              {/* STEP 1 */}
              {step===1 && (
                <div className="step-body" style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div>
                    <label className="form-label">Adresse email</label>
                    <input type="email" className="form-input" style={{ padding:'13px 14px' }} placeholder="vous@exemple.fr" value={form.email} onChange={set('email')} />
                  </div>
                  <div>
                    <label className="form-label">Mot de passe</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPassword?'text':'password'} className="form-input" style={{ padding:'13px 44px 13px 14px' }} placeholder="Min. 8 caractères" value={form.password} onChange={set('password')} />
                      <button type="button" className="eye-btn" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'🙈':'👁️'}</button>
                    </div>
                    {form.password && (
                      <div style={{ marginTop:10 }}>
                        <div style={{ display:'flex', gap:4, marginBottom:5 }}>
                          {[1,2,3,4].map(n=>(
                            <div key={n} style={{ flex:1, height:4, borderRadius:4, transition:'background .3s', background:n<=sw?strengthColors[sw-1]:'rgba(26,25,23,0.1)' }} />
                          ))}
                        </div>
                        {sw>0 && <span style={{ fontSize:12, color:strengthColors[sw-1], fontWeight:600 }}>{strengthLabels[sw-1]}</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Confirmer le mot de passe</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPassword?'text':'password'} className="form-input" style={{ padding:'13px 44px 13px 14px', borderColor:form.confirmPassword&&form.password!==form.confirmPassword?'#EF4444':'' }} placeholder="Répétez votre mot de passe" value={form.confirmPassword} onChange={set('confirmPassword')} />
                      {form.confirmPassword && (
                        <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:15 }}>
                          {form.password===form.confirmPassword?'✅':'❌'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step===2 && (
                <div className="step-body" style={{ display:'flex', flexDirection:'column', gap:18 }}>

                  {/* Photo de profil */}
                  <div style={{ textAlign:'center', marginBottom:4 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:14 }}>
                      Photo de profil <span style={{ fontWeight:400, color:'#bbb' }}>(optionnelle)</span>
                    </div>
                    <div style={{ position:'relative', display:'inline-block' }}>
                      <div
                        onClick={() => avatarInputRef.current?.click()}
                        style={{ width:90, height:90, borderRadius:'50%', border:'2.5px dashed #1A9E8A', background: avatarPreview ? 'transparent' : '#E8F7F4', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', transition:'all .18s', margin:'0 auto' }}>
                        {avatarPreview
                          ? <img src={avatarPreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                          : <span style={{ fontSize:32 }}>📷</span>
                        }
                      </div>
                      {avatarPreview && (
                        <button type="button" onClick={() => { setAvatarPreview(null); setAvatarFile(null) }}
                          style={{ position:'absolute', top:-4, right:-4, width:22, height:22, borderRadius:'50%', background:'#EF4444', border:'2px solid #fff', color:'#fff', fontSize:11, fontWeight:900, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop:10, fontSize:12, color:'#94A3B8' }}>
                      {avatarPreview ? '✅ Photo sélectionnée' : 'Cliquez pour choisir une photo'}
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarPick} style={{ display:'none' }}/>
                  </div>

                  <div>
                    <label className="form-label" style={{ marginBottom:12 }}>Je souhaite...</label>
                    <div style={{ display:'flex', gap:10 }}>
                      {[
                        { v:'passenger', emoji:'🎒', label:'Voyager',   sub:'Passager' },
                        { v:'driver',    emoji:'🚗', label:'Conduire',  sub:'Conducteur' },
                        { v:'both',      emoji:'🔄', label:'Les deux',  sub:'Flexible' },
                      ].map(r=>(
                        <button key={r.v} type="button" className={`role-btn ${form.role===r.v?'active':''}`} onClick={()=>setForm(f=>({...f,role:r.v}))}>
                          <div style={{ fontSize:22, marginBottom:6 }}>{r.emoji}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:form.role===r.v?'#1A9E8A':'#1C1917' }}>{r.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Bio <span style={{ color:'#A8A39E', fontWeight:400 }}>(optionnel)</span></label>
                    <textarea className="form-input" style={{ padding:'13px 14px', minHeight:88, resize:'vertical' }} placeholder="Présentez-vous en quelques mots..." value={form.bio} onChange={set('bio')} />
                  </div>
                  {/* Langue de l'interface */}
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:'.05em' }}>
                      🌐 Language / Langue
                    </label>
                    <div style={{ display:'flex', gap:10 }}>
                      {[
                        { v:'en', flag:'🇬🇧', label:'English' },
                        { v:'fr', flag:'🇫🇷', label:'Français' },
                      ].map(l => (
                        <button key={l.v} type="button"
                          onClick={() => setForm(f => ({...f, language: l.v}))}
                          style={{ flex:1, padding:'12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:700, textAlign:'center',
                            background: form.language === l.v ? '#E8F7F4' : '#F8FAFC',
                            border: form.language === l.v ? '2px solid #1A9E8A' : '1.5px solid rgba(0,0,0,.1)',
                            color: form.language === l.v ? '#1A9E8A' : '#555',
                            transition:'all .15s',
                          }}>
                          {l.flag} {l.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize:11, color:'#94A3B8', margin:'6px 0 0' }}>
                      You can change this later in your profile settings.
                    </p>
                  </div>

                  <div style={{ background:'#E2F5F2', borderRadius:12, padding:'14px 16px', fontSize:13.5, color:'#1A9E8A', lineHeight:1.65, display:'flex', gap:10 }}>
                    <span>🔒</span>
                    <span>En créant un compte, vous acceptez nos <a href="#" style={{ fontWeight:700 }}>CGU</a> et notre <a href="#" style={{ fontWeight:700 }}>politique de confidentialité</a>.</span>
                  </div>
                </div>
              )}

              {/* STEP 3 — Véhicule (conducteur uniquement) */}
              {step === 3 && (
                <div className="step-body" style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ textAlign:'center', marginBottom:8 }}>
                    <div style={{ fontSize: 40, marginBottom:8 }}>🚗</div>
                    <h2 style={{ fontSize:20, fontWeight:800, color:'#1A1A1A', margin:'0 0 8px' }}>
                      Votre véhicule & documents
                    </h2>
                    <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.65, margin:0 }}>
                      Ces informations sont <strong>facultatives maintenant</strong> mais <strong>obligatoires</strong> avant de publier votre premier trajet.
                    </p>
                  </div>
                  <DriverDocs
                    mode="register"
                    onComplete={() => setRegistered(true)}
                  />
                </div>
              )}

              {/* Error */}
              {error && step < 3 && (
                <div style={{ background:'#FFF0F0', border:'1.5px solid rgba(220,38,38,0.2)', borderRadius:10, padding:'12px 14px', fontSize:13.5, color:'#DC2626', marginTop:16, display:'flex', gap:8, alignItems:'center' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Navigation — cachée à l'étape 3 (DriverDocs a ses propres boutons) */}
              {step < 3 && (
                <div style={{ display:'flex', gap:10, marginTop:22 }}>
                  {step>0 && (
                    <button type="button" className="btn-outline" style={{ flex:1, padding:'13px', fontSize:15 }} onClick={prev}>← Retour</button>
                  )}
                  {step<2 ? (
                    <button type="button" className="btn-primary" style={{ flex:1, padding:'13px', fontSize:15 }} onClick={next}>Continuer →</button>
                  ) : (
                    <button type="submit" className="btn-primary" style={{ flex:1, padding:'13px', fontSize:15 }} disabled={loading}>
                      {loading ? (
                        <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                          <span style={{ width:16, height:16, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', display:'inline-block', animation:'spin .8s linear infinite' }} />
                          Création...
                        </span>
                      ) : '🎉 Créer mon compte'}
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          <p style={{ textAlign:'center', fontSize:14, color:'#6B6560' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color:'#1A9E8A', fontWeight:700 }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </>
  )
}
