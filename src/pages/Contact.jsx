import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../utils/api'

const CATEGORIES = [
  { key: 'booking',    icon: '🎫', label: 'Problème de réservation',  desc: 'Annulation, remboursement, litige' },
  { key: 'account',    icon: '👤', label: 'Problème de compte',        desc: 'Connexion, vérification, blocage' },
  { key: 'payment',    icon: '💰', label: 'Problème de paiement',      desc: 'Transaction, Mobile Money' },
  { key: 'safety',     icon: '🚨', label: 'Signalement de sécurité',   desc: 'Comportement, fraude, incident' },
  { key: 'suggestion', icon: '💡', label: 'Suggestion',                desc: 'Amélioration, nouvelle fonctionnalité' },
  { key: 'other',      icon: '📌', label: 'Autre',                     desc: 'Toute autre demande' },
]

const FAQS = [
  {
    q: 'Comment annuler une réservation ?',
    a: 'Rendez-vous dans "Mes trajets", trouvez la réservation concernée et cliquez sur "Annuler". L\'annulation est possible tant que le trajet n\'a pas commencé.',
  },
  {
    q: 'Mon email de vérification n\'est pas arrivé.',
    a: 'Vérifiez vos spams. Sinon, retournez sur la page de connexion et cliquez "Renvoyer l\'email de vérification".',
  },
  {
    q: 'Comment modifier mon trajet publié ?',
    a: 'Dans "Mes trajets > Mes trajets publiés", cliquez sur "✏️ Modifier" sur le trajet concerné. Vous pouvez modifier le prix, les horaires et les points de rendez-vous.',
  },
  {
    q: 'Combien de temps pour valider mes documents ?',
    a: 'La vérification de vos documents (permis + CNI) prend généralement moins de 24 heures en jours ouvrés.',
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,.07)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '16px 0', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', textAlign: 'left', flex: 1 }}>{q}</span>
        <span style={{ fontSize: 18, color: '#1A9E8A', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 13.5, color: '#6B7280', lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  )
}

export default function Contact() {
  const { t } = useLang()
  const { user } = useAuth()

  const [form, setForm] = useState({
    name:     user?.firstName ? `${user.firstName} ${user.lastName}` : '',
    email:    user?.email     || '',
    category: '',
    subject:  '',
    message:  '',
  })
  const [step,    setStep]    = useState('form')   // 'form' | 'success'
  const [sending, setSending] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category)        { setError('Choisissez une catégorie.'); return }
    if (!form.subject.trim())  { setError('Indiquez un sujet.'); return }
    if (form.message.length < 20) { setError('Votre message doit faire au moins 20 caractères.'); return }

    setSending(true); setError('')
    try {
      const res  = await fetch(`${API_URL}/api/contact`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) setStep('success')
      else setError(data.message)
    } catch { setError('Impossible de contacter le serveur. Réessayez.') }
    finally { setSending(false) }
  }

  // ── Page succès ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 8px 36px rgba(0,0,0,.08)', animation: 'fadeUp .4s ease' }}>
          <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#E8F7F4,#C8F0EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px' }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A1A', margin: '0 0 12px' }}>Message envoyé !</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 8px' }}>
            Nous avons bien reçu votre message et vous enverrons une confirmation à <strong>{form.email}</strong>.
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 32px' }}>
            Délai de réponse habituel : <strong style={{ color: '#1A9E8A' }}>24 à 48 heures</strong> en jours ouvrés.
          </p>
          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Retour à l'accueil
              </button>
            </Link>
            <button onClick={() => { setStep('form'); setForm(f => ({ ...f, subject: '', message: '', category: '' })) }}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,.1)', background: 'none', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Envoyer un autre message
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulaire ───────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .contact-input { width:100%; box-sizing:border-box; padding:11px 14px; border:1.5px solid rgba(0,0,0,.12); border-radius:10px; font-size:14px; font-family:'Plus Jakarta Sans',sans-serif; outline:none; color:#1A1A1A; transition:border-color .18s; background:#fff; }
        .contact-input:focus { border-color:#1A9E8A; box-shadow:0 0 0 3px rgba(26,158,138,.1); }
        .field-label { font-size:11px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:.06em; display:block; margin-bottom:7px; }
        .cat-btn { border:1.5px solid rgba(0,0,0,.1); background:#fff; border-radius:12px; padding:12px 14px; cursor:pointer; font-family:inherit; transition:all .18s; text-align:left; width:100%; }
        .cat-btn:hover { border-color:#1A9E8A; background:#E8F7F4; }
        .cat-btn.active { border-color:#1A9E8A; background:#E8F7F4; }
      `}</style>

      <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F7F5F2', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

        {/* ── Hero ── */}
        <div style={{ background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', padding: '48px 0 64px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.7)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Assistance</div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-.02em' }}>
              Comment pouvons-nous vous aider ?
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.8)', margin: 0, lineHeight: 1.65, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              Notre équipe camerounaise est disponible pour vous aider du lundi au samedi, de 8h à 20h.
            </p>
          </div>
        </div>

        {/* ── Infos rapides ── */}
        <div style={{ maxWidth: 960, margin: '-28px auto 0', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 36 }}>
            {[
              { icon: '📧', label: 'Email', value: 'support@covoitgo.cm', href: 'mailto:support@covoitgo.cm' },
              { icon: '📞', label: 'Téléphone', value: '+237 6XX XXX XXX', href: 'tel:+237600000000' },
              { icon: '💬', label: 'WhatsApp', value: 'Chat direct', href: 'https://wa.me/237600000000' },
              { icon: '🕐', label: 'Horaires', value: 'Lun–Sam 8h–20h', href: null },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 4px 18px rgba(0,0,0,.07)', border: '1px solid rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</div>
                  {c.href
                    ? <a href={c.href} style={{ fontSize: 13, fontWeight: 700, color: '#1A9E8A', textDecoration: 'none' }}>{c.value}</a>
                    : <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{c.value}</div>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Corps principal ── */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 60px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>

          {/* ══ Formulaire ══ */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', boxShadow: '0 2px 14px rgba(0,0,0,.06)', border: '1px solid #E2E8F0', animation: 'fadeUp .4s ease' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1A1A1A', margin: '0 0 24px' }}>Envoyer un message</h2>

            <form onSubmit={handleSubmit}>

              {/* Identité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div>
                  <label className="field-label">Votre nom <span style={{ color: '#EF4444' }}>*</span></label>
                  <input className="contact-input" value={form.name} onChange={set('name')}
                    placeholder="Jean Dupont" required maxLength={100}/>
                </div>
                <div>
                  <label className="field-label">Votre email <span style={{ color: '#EF4444' }}>*</span></label>
                  <input className="contact-input" type="email" value={form.email} onChange={set('email')}
                    placeholder="vous@exemple.cm" required/>
                </div>
              </div>

              {/* Catégorie */}
              <div style={{ marginBottom: 18 }}>
                <label className="field-label">Catégorie <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.key} type="button"
                      className={`cat-btn${form.category === c.key ? ' active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, category: c.key }))}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: form.category === c.key ? '#1A9E8A' : '#1A1A1A', lineHeight: 1.3 }}>{c.label}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.3, marginTop: 1 }}>{c.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sujet */}
              <div style={{ marginBottom: 18 }}>
                <label className="field-label">Sujet <span style={{ color: '#EF4444' }}>*</span></label>
                <input className="contact-input" value={form.subject} onChange={set('subject')}
                  placeholder="Décrivez brièvement votre demande…" required minLength={5} maxLength={150}/>
                <div style={{ textAlign: 'right', fontSize: 10, color: '#bbb', marginTop: 4 }}>{form.subject.length}/150</div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: 22 }}>
                <label className="field-label">Message <span style={{ color: '#EF4444' }}>*</span></label>
                <textarea className="contact-input" value={form.message} onChange={set('message')}
                  placeholder="Décrivez votre problème ou question en détail. Plus vous êtes précis, plus vite nous pourrons vous aider."
                  rows={6} required minLength={20} maxLength={2000}
                  style={{ resize: 'vertical', lineHeight: 1.65, minHeight: 130 }}/>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: form.message.length < 20 ? '#EF4444' : '#bbb' }}>
                    {form.message.length < 20 ? `${20 - form.message.length} caractères minimum` : ''}
                  </span>
                  <span style={{ fontSize: 10, color: '#bbb' }}>{form.message.length}/2000</span>
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div style={{ background: '#FEF2F2', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Bouton */}
              <button type="submit" disabled={sending}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: sending ? '#ccc' : 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
                  color: '#fff', fontSize: 15, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'opacity .2s',
                }}>
                {sending ? (
                  <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }}/> Envoi en cours…</>
                ) : '📨 Envoyer le message'}
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 14 }}>
                Vous recevrez une confirmation par email · Réponse sous 24-48h
              </p>
            </form>
          </div>

          {/* ══ Sidebar droite ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* FAQ */}
            <div style={{ background: '#fff', borderRadius: 18, padding: '22px 22px', boxShadow: '0 2px 14px rgba(0,0,0,.06)', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#1A1A1A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🙋</span> Questions fréquentes
              </h3>
              {FAQS.map((f, i) => <FaqItem key={i} {...f}/>)}
            </div>

            {/* Urgence */}
            <div style={{ background: 'linear-gradient(135deg,#FEF2F2,#FFF5F5)', borderRadius: 16, padding: '20px', border: '1.5px solid rgba(239,68,68,.2)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🚨</div>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#DC2626', margin: '0 0 8px' }}>Urgence sécurité ?</h4>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.65, margin: '0 0 14px' }}>
                Pour tout incident grave pendant un trajet, contactez d'abord les services d'urgence.
              </p>
              <a href="tel:117" style={{ textDecoration: 'none' }}>
                <button style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  📞 Police secours : 117
                </button>
              </a>
            </div>

            {/* Liens rapides */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#374151', margin: '0 0 12px' }}>Liens utiles</h4>
              {[
                { to: '/terms',   icon: '📋', label: 'Conditions générales' },
                { to: '/privacy', icon: '🔒', label: 'Politique de confidentialité' },
                { to: '/search',  icon: '🔍', label: 'Trouver un trajet' },
                { to: '/publish', icon: '🚗', label: 'Publier un trajet' },
              ].map(l => (
                <Link key={l.to} to={l.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(0,0,0,.05)', textDecoration: 'none', color: '#555', fontSize: 13, fontWeight: 600, transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#1A9E8A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#555'}>
                  <span style={{ fontSize: 15 }}>{l.icon}</span>
                  {l.label}
                  <span style={{ marginLeft: 'auto', color: '#CBD5E1', fontSize: 12 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
