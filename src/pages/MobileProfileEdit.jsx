import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'

// ══════════════════════════════════════════════════════════════
//  MobileProfileEdit — Modifier le profil
// ══════════════════════════════════════════════════════════════

export default function MobileProfileEdit() {
  const { user, fetchMe } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName:  user?.lastName  || '',
    phone:     user?.phone     || '',
    bio:       user?.bio       || '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  if (!user) { navigate('/login'); return null }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image trop lourde (max 5 Mo)'); return }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setLoading(true); setError(''); setSuccess('')
    try {
      // 1. Mettre à jour le profil
      const res  = await authFetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message || 'Erreur'); setLoading(false); return }

      // 2. Uploader la photo si changée
      if (avatarFile) {
        const fd = new FormData()
        fd.append('avatar', avatarFile)
        await authFetch(`${API_URL}/api/auth/avatar`, { method: 'POST', body: fd })
      }

      await fetchMe()
      setSuccess('Profil mis à jour ✓')
      setTimeout(() => navigate('/profile'), 1000)
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  const firstLetter = (form.firstName || '?')[0]?.toUpperCase()
  const avatarBg = user.avatarColor || '#1A9E8A'

  return (
    <div style={{ background:'#F7F8FA', minHeight:'100vh', paddingBottom:80, fontFamily:"-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#fff', padding:'12px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', color:'#111', padding:0, lineHeight:1 }}>
          ‹
        </button>
        <h1 style={{ fontSize:18, fontWeight:900, color:'#111', margin:0, flex:1 }}>
          Modifier le profil
        </h1>
        <button onClick={save} disabled={loading}
          style={{ background:'none', border:'none', color:'#1A9E8A', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
          {loading ? '…' : 'Enregistrer'}
        </button>
      </div>

      {/* Avatar */}
      <div style={{ background:'#fff', padding:'32px 20px', textAlign:'center', borderBottom:'1px solid #F3F4F6' }}>
        <label style={{ position:'relative', display:'inline-block', cursor:'pointer' }}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="" style={{ width:110, height:110, borderRadius:'50%', objectFit:'cover' }}/>
          ) : user.avatarUrl ? (
            <img src={`${API_URL}${user.avatarUrl}`} alt="" style={{ width:110, height:110, borderRadius:'50%', objectFit:'cover' }}/>
          ) : (
            <div style={{ width:110, height:110, borderRadius:'50%', background:avatarBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44, fontWeight:900, color:'#fff' }}>
              {firstLetter}
            </div>
          )}
          <div style={{ position:'absolute', bottom:4, right:4, width:34, height:34, borderRadius:'50%', background:'#1A9E8A', color:'#fff', border:'3px solid #fff', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>
            📷
          </div>
          <input type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
        </label>
        <p style={{ fontSize:12, color:'#6B7280', margin:'12px 0 0' }}>Changer la photo</p>
      </div>

      {/* Formulaire */}
      <div style={{ background:'#fff', padding:'0 20px' }}>
        <Field label="Prénom" value={form.firstName} onChange={set('firstName')}/>
        <Field label="Nom"    value={form.lastName}  onChange={set('lastName')}/>
        <Field label="Téléphone" value={form.phone} onChange={set('phone')} type="tel" placeholder="+237 6XX XXX XXX"/>
        <Field label="À propos de moi" value={form.bio} onChange={set('bio')} multiline placeholder="Parlez un peu de vous…"/>
      </div>

      {error && (
        <div style={{ margin:16, padding:14, background:'#FEF2F2', borderRadius:12, color:'#DC2626', fontSize:13 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ margin:16, padding:14, background:'#D1FAE5', borderRadius:12, color:'#065F46', fontSize:13 }}>
          ✓ {success}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, multiline, type = 'text', placeholder = '' }) {
  return (
    <div style={{ padding:'16px 0', borderBottom:'1px solid #F3F4F6' }}>
      <label style={{ fontSize:12, fontWeight:700, color:'#6B7280', display:'block', marginBottom:6 }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
          style={{ width:'100%', border:'none', outline:'none', fontSize:15, fontFamily:'inherit', color:'#111', background:'transparent', resize:'vertical' }}/>
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          style={{ width:'100%', border:'none', outline:'none', fontSize:15, fontFamily:'inherit', color:'#111', background:'transparent' }}/>
      )}
    </div>
  )
}
