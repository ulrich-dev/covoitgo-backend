import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'

// ══════════════════════════════════════════════════════════════
//  MobileSecurity — Sécurité & mot de passe
// ══════════════════════════════════════════════════════════════

export default function MobileSecurity() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  })
  const [showPwd, setShowPwd] = useState({ current:false, new:false, confirm:false })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  if (!user) { navigate('/login'); return null }

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setError(''); setSuccess('')
  }

  // ── Validation du nouveau mot de passe ──────────────────────
  const hasLength = form.newPassword.length >= 8
  const hasUpper  = /[A-Z]/.test(form.newPassword)
  const hasDigit  = /[0-9]/.test(form.newPassword)
  const hasLower  = /[a-z]/.test(form.newPassword)
  const match     = form.newPassword && form.newPassword === form.confirmPassword
  const valid     = form.currentPassword && hasLength && hasUpper && hasDigit && hasLower && match

  const submit = async () => {
    if (!valid) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const res  = await authFetch(`${API_URL}/api/auth/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword:     form.newPassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('Mot de passe modifié avec succès ✓')
        setForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
        setTimeout(() => navigate('/profile'), 1500)
      } else {
        setError(data.message || 'Erreur lors de la modification')
      }
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background:'#F7F8FA', minHeight:'100vh', paddingBottom:80, fontFamily:"-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#fff', padding:'12px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'#111', padding:0, lineHeight:1 }}>
          ‹
        </button>
        <h1 style={{ fontSize:18, fontWeight:900, color:'#111', margin:0, flex:1 }}>
          Sécurité & mot de passe
        </h1>
      </div>

      {/* Info */}
      <div style={{ background:'#EEF2FF', margin:16, padding:'14px 16px', borderRadius:14, borderLeft:'3px solid #4F46E5' }}>
        <p style={{ fontSize:13, color:'#4338CA', margin:0, lineHeight:1.5 }}>
          🔐 Pour votre sécurité, votre mot de passe ne doit jamais être partagé avec quelqu'un d'autre.
        </p>
      </div>

      {/* Formulaire */}
      <div style={{ background:'#fff', margin:'0 16px', borderRadius:16, padding:'8px 16px' }}>

        <PwdField
          label="Mot de passe actuel"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          show={showPwd.current}
          onToggle={() => setShowPwd(s => ({ ...s, current: !s.current }))}
          autoComplete="current-password"
        />

        <PwdField
          label="Nouveau mot de passe"
          value={form.newPassword}
          onChange={set('newPassword')}
          show={showPwd.new}
          onToggle={() => setShowPwd(s => ({ ...s, new: !s.new }))}
          autoComplete="new-password"
        />

        <PwdField
          label="Confirmer le nouveau mot de passe"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          show={showPwd.confirm}
          onToggle={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}
          autoComplete="new-password"
          last
        />
      </div>

      {/* Critères */}
      {form.newPassword.length > 0 && (
        <div style={{ margin:'16px', background:'#fff', borderRadius:16, padding:'16px' }}>
          <p style={{ fontSize:12, fontWeight:800, color:'#6B7280', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'.05em' }}>
            Votre mot de passe doit contenir
          </p>
          <Criteria ok={hasLength} text="Au moins 8 caractères"/>
          <Criteria ok={hasUpper}  text="Une lettre majuscule"/>
          <Criteria ok={hasLower}  text="Une lettre minuscule"/>
          <Criteria ok={hasDigit}  text="Un chiffre"/>
          {form.confirmPassword && <Criteria ok={match} text="Les deux mots de passe correspondent"/>}
        </div>
      )}

      {error && (
        <div style={{ margin:'0 16px 12px', padding:14, background:'#FEF2F2', borderRadius:12, color:'#DC2626', fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ margin:'0 16px 12px', padding:14, background:'#D1FAE5', borderRadius:12, color:'#065F46', fontSize:13 }}>
          ✓ {success}
        </div>
      )}

      {/* Bouton */}
      <div style={{ padding:'16px' }}>
        <button onClick={submit} disabled={!valid || loading}
          style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, background: valid && !loading ? 'linear-gradient(135deg,#1A9E8A,#22C6AD)' : '#E5E7EB', color:'#fff', fontSize:15, fontWeight:800, cursor: valid && !loading ? 'pointer' : 'not-allowed', fontFamily:'inherit' }}>
          {loading ? 'Modification…' : 'Modifier le mot de passe'}
        </button>
      </div>

      {/* Mot de passe oublié */}
      <div style={{ padding:'0 16px', textAlign:'center' }}>
        <button onClick={() => navigate('/forgot-password')}
          style={{ background:'none', border:'none', color:'#1A9E8A', fontSize:14, fontWeight:700, cursor:'pointer', padding:'12px' }}>
          Mot de passe oublié ?
        </button>
      </div>
    </div>
  )
}

// ── Champ mot de passe avec bouton afficher ─────────────────
function PwdField({ label, value, onChange, show, onToggle, autoComplete, last }) {
  return (
    <div style={{ padding:'14px 0', borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <label style={{ fontSize:12, fontWeight:700, color:'#6B7280', display:'block', marginBottom:6 }}>
        {label}
      </label>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          style={{ flex:1, border:'none', outline:'none', fontSize:15, fontFamily:'inherit', color:'#111', background:'transparent', letterSpacing: show ? 'normal' : '2px' }}
          placeholder="••••••••"
        />
        <button type="button" onClick={onToggle}
          style={{ background:'none', border:'none', fontSize:16, cursor:'pointer', color:'#9CA3AF', padding:4 }}>
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )
}

// ── Critère de validation ───────────────────────────────────
function Criteria({ ok, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0' }}>
      <span style={{ width:18, height:18, borderRadius:'50%', background: ok ? '#D1FAE5' : '#F3F4F6', color: ok ? '#065F46' : '#9CA3AF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, flexShrink:0 }}>
        {ok ? '✓' : '○'}
      </span>
      <span style={{ fontSize:13, color: ok ? '#065F46' : '#6B7280' }}>{text}</span>
    </div>
  )
}
