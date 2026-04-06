import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/api'
import { fmtFCFA } from '../data/cameroun'
import ReviewModal from '../components/ReviewModal'
import AvatarUpload from '../components/AvatarUpload'

const stars = (r, size = 14) => Array.from({ length: 5 }, (_, i) => (
  <span key={i} style={{ color: i < Math.round(r) ? '#F59E0B' : '#E2E8F0', fontSize: size }}>★</span>
))

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  : '—'

export default function Profile() {
  const { t, lang, setLang } = useLang()
  const { user, setUser, fetchMe } = useAuth()
  const navigate = useNavigate()
  const [urlParams] = useSearchParams()

  const [tab,         setTab]         = useState('info')
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [reviews,     setReviews]     = useState([])
  const [reviewStats, setReviewStats] = useState(null)
  const [wallet,      setWallet]      = useState(null)
  const [reviewModal, setReviewModal] = useState(null)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', bio: '', language: 'en',
  })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    setForm({
      firstName: user.firstName || '',
      lastName:  user.lastName  || '',
      phone:     user.phone     || '',
      bio:       user.bio       || '',
      language:  user.language  || 'en',
    })

    // Si lien depuis email d'avis (?review=bookingId) → ouvrir le modal directement
    const reviewBooking = urlParams.get('review')
    if (reviewBooking) {
      setTab('reviews')
      checkReview(reviewBooking)
    }

    loadReviews()
    loadWallet()
  }, [user])

  const checkReview = async (bookingId) => {
    try {
      const res  = await fetch(`${API_URL}/api/reviews/can-review/${bookingId}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success && data.canReview) {
        setReviewModal({ bookingId, driverName: data.driverName, from: data.from, to: data.to })
      }
    } catch {}
  }

  const loadReviews = async () => {
    if (!user?.id) return
    try {
      const res  = await fetch(`${API_URL}/api/reviews/driver/${user.id}`)
      const data = await res.json()
      if (data.success) { setReviews(data.reviews); setReviewStats(data.stats) }
    } catch {}
  }

  const loadWallet = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/trips/my-bookings`, { credentials: 'include' })
      const data = await res.json()
      if (!data.success) return

      // ── Gains conducteur ──────────────────────────────────────
      // asDriver = liste de trajets publiés, chacun a un tableau bookings[]
      // On somme les places × prix des réservations confirmées ou terminées
      let earnings     = 0
      let driverTrips  = 0   // nombre de trajets avec au moins 1 passager confirmé

      for (const trip of data.asDriver) {
        const confirmedBookings = (trip.bookings || []).filter(
          b => ['confirmed', 'completed'].includes(b.bookingStatus)
        )
        if (confirmedBookings.length > 0) {
          driverTrips++
          for (const b of confirmedBookings) {
            // prix du trajet × places réservées, moins 10% de commission
            earnings += trip.trip.price * b.seatsBooked * 0.9
          }
        }
      }

      // ── Dépenses passager ─────────────────────────────────────
      // asPassenger = liste de réservations plates (structure inchangée)
      const confirmedPassenger = data.asPassenger.filter(
        b => ['confirmed', 'completed'].includes(b.bookingStatus)
      )
      const spent = confirmedPassenger.reduce(
        (sum, b) => sum + (b.trip.price * b.seatsBooked), 0
      )

      // ── Statistiques générales ────────────────────────────────
      const totalPublished  = data.asDriver.length       // tous les trajets publiés
      const passengerTrips  = confirmedPassenger.length  // réservations confirmées

      setWallet({
        earnings:        Math.round(earnings),
        spent:           Math.round(spent),
        driverTrips,                  // trajets conducteur avec passagers confirmés
        totalPublished,               // tous les trajets publiés (même vides)
        passengerTrips,               // réservations passager confirmées
        // Économies réalisées vs taxi (estimation ×3)
        savings: Math.round(spent * 2),
      })
    } catch (err) {
      console.error('loadWallet:', err)
    }
  }

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const res  = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        // Synchroniser la langue de l'interface si elle a changé
        if (form.language && form.language !== lang) {
          setLang(form.language)
        }
        await fetchMe()
        setEditing(false)
        setSuccess(t.profile.saved)
        setTimeout(() => setSuccess(''), 3000)
      } else setError(data.message)
    } catch { setError(t.misc.server_error) }
    finally { setSaving(false) }
  }

  if (!user) return null

  const avgRating = reviewStats?.avgRating || user.rating || 0
  const totalReviews = reviewStats?.total || user.reviewCount || 0

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .profile-tab { padding:10px 20px; border:none; background:transparent; cursor:pointer; font-family:inherit; font-size:14px; font-weight:600; color:#888; border-bottom:3px solid transparent; transition:all .18s; }
        .profile-tab.active { color:#1A9E8A; border-bottom-color:#1A9E8A; }
        .profile-tab:hover:not(.active) { color:#555; }
        .field-label { font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; display:block; }
        .field-input { width:100%; box-sizing:border-box; padding:11px 14px; border:1.5px solid rgba(0,0,0,.12); border-radius:10px; font-size:14px; font-family:inherit; outline:none; color:#1A1A1A; transition:border-color .18s; }
        .field-input:focus { border-color:#1A9E8A; }
      `}</style>

      <div style={{ minHeight:'calc(100vh - 72px)', background:'#F7F5F2', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        {/* ── Header profil ── */}
        <div style={{ background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', padding:'32px 0 0' }}>
          <div style={{ maxWidth:760, margin:'0 auto', padding:'0 20px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:20, marginBottom:24 }}>
              {/* Avatar avec upload */}
              <AvatarUpload
                user={user}
                size={88}
                editable={true}
                onUpload={(url) => setUser(u => ({ ...u, avatarUrl: url }))}
              />
              <div style={{ flex:1, paddingBottom:4 }}>
                <div style={{ color:'#fff', fontSize:24, fontWeight:900, letterSpacing:'-.02em' }}>
                  {user.firstName} {user.lastName}
                </div>

                {/* ── Étoiles ── */}
                {avgRating > 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, flexWrap:'wrap' }}>
                    {/* Étoiles visuelles */}
                    <div style={{ display:'flex', gap:2 }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{
                          fontSize: 22,
                          color: s <= Math.round(avgRating) ? '#FCD34D' : 'rgba(255,255,255,.3)',
                          filter: s <= Math.round(avgRating) ? 'drop-shadow(0 1px 3px rgba(252,211,77,.5))' : 'none',
                          lineHeight: 1,
                        }}>★</span>
                      ))}
                    </div>
                    {/* Note chiffrée */}
                    <span style={{ color:'#fff', fontSize:20, fontWeight:900, letterSpacing:'-.02em' }}>
                      {avgRating.toFixed(1)}
                    </span>
                    <span style={{ color:'rgba(255,255,255,.7)', fontSize:13, fontWeight:600 }}>
                      · {totalReviews} avis
                    </span>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:2, marginTop:8 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ fontSize:20, color:'rgba(255,255,255,.3)' }}>★</span>
                    ))}
                    <span style={{ color:'rgba(255,255,255,.55)', fontSize:13, fontWeight:600, marginLeft:8 }}>
                      Pas encore d'avis
                    </span>
                  </div>
                )}

                <div style={{ color:'rgba(255,255,255,.65)', fontSize:12, marginTop:6 }}>
                  Membre depuis {fmtDate(user.memberSince)}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,.2)' }}>
              {[
                { id:'info',    label:'👤 Informations' },
                { id:'wallet',  label:'💰 Portefeuille' },
                { id:'reviews', label:`⭐ Avis (${totalReviews})` },
              ].map(t => (
                <button key={t.id} className={`profile-tab${tab===t.id?' active':''}`}
                  onClick={() => setTab(t.id)}
                  style={{ color: tab===t.id ? '#fff' : 'rgba(255,255,255,.65)', borderBottomColor: tab===t.id ? '#fff' : 'transparent', paddingBottom:14 }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div style={{ maxWidth:760, margin:'0 auto', padding:'28px 20px 60px', animation:'fadeUp .35s ease' }}>

          {/* ═══ TAB INFO ═══ */}
          {tab === 'info' && (
            <div style={{ background:'#fff', borderRadius:16, padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,.05)', border:'1px solid #E2E8F0' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <h2 style={{ fontSize:17, fontWeight:800, color:'#1A1A1A', margin:0 }}>{t.profile.personal_info}</h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)}
                    style={{ background:'#E8F7F4', border:'none', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:700, color:'#1A9E8A', cursor:'pointer', fontFamily:'inherit' }}>
                    ✏️ Modifier
                  </button>
                ) : (
                  <button onClick={() => { setEditing(false); setError('') }}
                    style={{ background:'none', border:'1px solid rgba(0,0,0,.1)', borderRadius:9, padding:'8px 16px', fontSize:13, fontWeight:700, color:'#888', cursor:'pointer', fontFamily:'inherit' }}>
                    Annuler
                  </button>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div>
                  <span className="field-label">Prénom</span>
                  {editing
                    ? <input className="field-input" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} />
                    : <div style={{ padding:'11px 0', fontSize:14, fontWeight:600, color:'#1A1A1A' }}>{user.firstName}</div>
                  }
                </div>
                <div>
                  <span className="field-label">Nom</span>
                  {editing
                    ? <input className="field-input" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} />
                    : <div style={{ padding:'11px 0', fontSize:14, fontWeight:600, color:'#1A1A1A' }}>{user.lastName}</div>
                  }
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <div>
                  <span className="field-label">Email</span>
                  <div style={{ padding:'11px 0', fontSize:14, fontWeight:600, color:'#6B7280' }}>{user.email}</div>
                  {user.emailVerified && <div style={{ fontSize:11, color:'#1A9E8A', fontWeight:700 }}>✅ Vérifié</div>}
                </div>
                <div>
                  <span className="field-label">Téléphone</span>
                  {editing
                    ? <input className="field-input" type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder={t.profile.phone_ph} />
                    : <div style={{ padding:'11px 0', fontSize:14, fontWeight:600, color: user.phone ? '#1A1A1A' : '#bbb' }}>{user.phone || t.profile.no_phone}</div>
                  }
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <span className="field-label">{t.profile.bio}</span>
                {editing
                  ? <textarea className="field-input" value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} rows={3} style={{ resize:'vertical', lineHeight:1.6 }} placeholder={t.profile.bio_ph} />
                  : <div style={{ padding:'11px 0', fontSize:14, color: user.bio ? '#1A1A1A' : '#bbb', lineHeight:1.65 }}>{user.bio || t.profile.no_bio}</div>
                }
              </div>

              {/* Langue de l'interface */}
              <div style={{ marginBottom:16 }}>
                <span className="field-label">🌐 {lang === 'fr' ? 'Langue' : 'Language'}</span>
                {editing ? (
                  <div style={{ display:'flex', gap:10, marginTop:6 }}>
                    {[
                      { v:'en', flag:'🇬🇧', label:'English' },
                      { v:'fr', flag:'🇫🇷', label:'Français' },
                    ].map(l => (
                      <button key={l.v} type="button"
                        onClick={() => setForm(f => ({...f, language: l.v}))}
                        style={{ flex:1, padding:'10px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                          fontSize:13, fontWeight:700, textAlign:'center',
                          background: form.language === l.v ? '#E8F7F4' : '#F8FAFC',
                          border: form.language === l.v ? '2px solid #1A9E8A' : '1.5px solid rgba(0,0,0,.1)',
                          color: form.language === l.v ? '#1A9E8A' : '#555',
                          transition:'all .15s',
                        }}>
                        {l.flag} {l.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding:'11px 0', fontSize:14, fontWeight:600, color:'#1A1A1A' }}>
                    {(user.language || 'en') === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                  </div>
                )}
              </div>

              {error   && <div style={{ background:'#FEF2F2', color:'#DC2626', borderRadius:9, padding:'10px 14px', fontSize:13, fontWeight:600, marginBottom:12 }}>⚠️ {error}</div>}
              {success && <div style={{ background:'#E8F7F4', color:'#1A9E8A', borderRadius:9, padding:'10px 14px', fontSize:13, fontWeight:700, marginBottom:12 }}>{success}</div>}

              {editing && (
                <button onClick={handleSave} disabled={saving}
                  style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#1A9E8A,#22C6AD)', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}>
                  {saving ? t.profile.saving : `✅ ${t.profile.save}`}
                </button>
              )}
            </div>
          )}

          {/* ═══ TAB WALLET ═══ */}
          {tab === 'wallet' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14 }}>
                {[
                  {
                    icon:'💰', label:'Gains conducteur',
                    value: wallet ? fmtFCFA(wallet.earnings) : '—',
                    sub: wallet ? `sur ${wallet.driverTrips} trajet${wallet.driverTrips>1?'s':''} avec passagers` : 'après commission 10%',
                    color:'#1A9E8A', bg:'#E8F7F4',
                  },
                  {
                    icon:'🎫', label:'Total dépensé',
                    value: wallet ? fmtFCFA(wallet.spent) : '—',
                    sub: wallet ? `sur ${wallet.passengerTrips} réservation${wallet.passengerTrips>1?'s':''}` : 'en tant que passager',
                    color:'#FF6B35', bg:'#FFF5F0',
                  },
                  {
                    icon:'🚗', label:'Trajets publiés',
                    value: wallet ? wallet.totalPublished : '—',
                    sub: wallet ? `dont ${wallet.driverTrips} avec passagers` : 'en tant que conducteur',
                    color:'#7C3AED', bg:'#F3EEFF',
                  },
                  {
                    icon:'💸', label:'Économies réalisées',
                    value: wallet ? fmtFCFA(wallet.savings) : '—',
                    sub: 'vs taxi (estimation ×3)',
                    color:'#F59E0B', bg:'#FFFBEB',
                  },
                ].map(c => (
                  <div key={c.label} style={{ background:'#fff', borderRadius:14, padding:'18px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:12 }}>{c.icon}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:c.color, letterSpacing:'-.02em' }}>{c.value}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginTop:3 }}>{c.label}</div>
                    <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:'#fff', borderRadius:14, padding:'20px', border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#1A1A1A', marginBottom:12 }}>ℹ️ À propos du portefeuille</div>
                <p style={{ fontSize:13, color:'#6B7280', lineHeight:1.7, margin:0 }}>
                  Le portefeuille affiche vos gains estimés en tant que conducteur (après commission de 10%) et vos dépenses en tant que passager. Le paiement se fait directement à bord ou via Mobile Money — Covoitgo ne gère pas les transactions financières pour le moment.
                </p>
              </div>
            </div>
          )}

          {/* ═══ TAB AVIS ═══ */}
          {tab === 'reviews' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Stats globales */}
              {reviewStats && reviewStats.total > 0 && (
                <div style={{ background:'#fff', borderRadius:14, padding:'20px 22px', border:'1px solid #E2E8F0', display:'flex', gap:24, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:48, fontWeight:900, color:'#1A1A1A', letterSpacing:'-.04em', lineHeight:1 }}>{avgRating.toFixed(1)}</div>
                    <div style={{ display:'flex', gap:2, justifyContent:'center', marginTop:6 }}>{stars(avgRating, 18)}</div>
                    <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>{totalReviews} avis</div>
                  </div>
                  <div style={{ flex:1, minWidth:200 }}>
                    {[5,4,3,2,1].map(n => {
                      const count = reviewStats.breakdown[n] || 0
                      const pct   = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
                      return (
                        <div key={n} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#6B7280', width:8 }}>{n}</span>
                          <span style={{ color:'#F59E0B', fontSize:12 }}>★</span>
                          <div style={{ flex:1, height:6, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:'#F59E0B', borderRadius:4, transition:'width .6s ease' }}/>
                          </div>
                          <span style={{ fontSize:11, color:'#94A3B8', width:28, textAlign:'right' }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Liste avis */}
              {reviews.length === 0 && (
                <div style={{ background:'#fff', borderRadius:14, padding:'48px 24px', textAlign:'center', border:'1px solid #E2E8F0' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#1A1A1A', marginBottom:6 }}>Aucun avis pour l'instant</div>
                  <div style={{ fontSize:13, color:'#94A3B8' }}>Les avis apparaîtront ici après vos trajets</div>
                </div>
              )}

              {reviews.map(r => (
                <div key={r.id} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                  <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background: r.reviewerColor || '#1A9E8A', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:15, flexShrink:0 }}>
                      {r.reviewerAvatar}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'#1A1A1A' }}>{r.reviewerName}</div>
                        <div style={{ display:'flex', gap:1 }}>{stars(r.rating, 13)}</div>
                      </div>
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>
                        {r.from} → {r.to} · {fmtDate(r.at)}
                      </div>
                    </div>
                  </div>
                  {r.comment && (
                    <p style={{ fontSize:13, color:'#374151', lineHeight:1.65, margin:0, fontStyle:'italic' }}>
                      "{r.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal avis */}
      {reviewModal && (
        <ReviewModal
          {...reviewModal}
          onClose={() => setReviewModal(null)}
          onSubmit={() => { setReviewModal(null); loadReviews() }}
        />
      )}
    </>
  )
}
