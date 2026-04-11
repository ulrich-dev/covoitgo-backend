import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL, authFetch } from '../utils/api'
import { fmtFCFA } from '../data/cameroun'

const PAYMENT_METHODS = [
  {
    id:      'mtn_momo',
    name:    'MTN Mobile Money',
    logo:    '🟡',
    color:   '#FCD34D',
    bgColor: '#FFFBEB',
    number:  '*126#',
    steps: [
      'Composez *126# sur votre téléphone MTN',
      'Choisissez "Transfert d\'argent"',
      'Entrez le numéro : +237 6XX XXX XXX',
      'Entrez le montant exact dû',
      'Confirmez avec votre code PIN',
      'Notez la référence de transaction',
    ],
    available: false,
  },
  {
    id:      'orange_money',
    name:    'Orange Money',
    logo:    '🟠',
    color:   '#F97316',
    bgColor: '#FFF7ED',
    number:  '#150#',
    steps: [
      'Composez #150# sur votre téléphone Orange',
      'Choisissez "Envoyer de l\'argent"',
      'Entrez le numéro : +237 6XX XXX XXX',
      'Entrez le montant exact dû',
      'Confirmez avec votre code PIN',
      'Notez la référence de transaction',
    ],
    available: false,
  },
]

export default function PaymentWall({ balanceDue: balanceProp }) {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [freemium,    setFreemium]    = useState(null)
  const [selectedMethod, setMethod]  = useState(null)
  const [phone,       setPhone]      = useState(user?.phone || '')
  const [reference,   setReference]  = useState('')
  const [submitting,  setSubmitting] = useState(false)
  const [submitted,   setSubmitted]  = useState(false)
  const [error,       setError]      = useState('')

  useEffect(() => {
    authFetch(`${API_URL}/api/freemium/status`, { })
      .then(r => r.json())
      .then(d => { if (d.success) setFreemium(d.freemium) })
  }, [])

  const balanceDue = balanceProp || freemium?.balanceDue || 0

  const handleSubmitPayment = async () => {
    if (!selectedMethod)  { setError('Choisissez un mode de paiement.'); return }
    if (!phone.trim())    { setError('Entrez votre numéro de téléphone.'); return }
    if (!reference.trim()){ setError('Entrez la référence de votre transaction.'); return }

    setSubmitting(true); setError('')
    try {
      const res  = await authFetch(`${API_URL}/api/freemium/payment-request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: selectedMethod, phone, reference }),
      })
      const data = await res.json()
      if (data.success) setSubmitted(true)
      else setError(data.message)
    } catch { setError('Impossible de contacter le serveur.') }
    finally { setSubmitting(false) }
  }

  // ── Demande envoyée ──────────────────────────────────────────
  if (submitted) return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F7F5F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 8px 36px rgba(0,0,0,.08)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: '0 0 12px' }}>Demande envoyée !</h2>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
          Notre équipe vérifie votre paiement. Votre compte sera débloqué sous <strong>24 heures ouvrées</strong>.
          Vous recevrez un email de confirmation.
        </p>
        <div style={{ background: '#E8F7F4', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#1A9E8A', fontWeight: 600 }}>
          📞 Pour accélérer : envoyez un SMS à <strong>+237 6XX XXX XXX</strong> avec votre référence.
        </div>
        <Link to="/my-trips">
          <button style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            Voir mes trajets
          </button>
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F7F5F2', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* Header bloqué */}
      <div style={{ background: 'linear-gradient(135deg,#1A1A2E,#16213E)', padding: '36px 0 52px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,.15)', border: '2px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 20px' }}>🔒</div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-.02em' }}>
            Publication temporairement bloquée
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
            Vous avez utilisé vos 10 trajets gratuits. Réglez votre commission pour continuer à publier.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '-28px auto 0', padding: '0 24px 60px' }}>

        {/* Montant dû */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', marginBottom: 20, boxShadow: '0 4px 18px rgba(0,0,0,.08)', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Montant dû</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#EF4444', letterSpacing: '-.03em' }}>{fmtFCFA(balanceDue)}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Commission Covoitgo (10%) sur votre dernier trajet</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Vos trajets</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1A1A1A' }}>{freemium?.tripsDone || '—'}</div>
              <div style={{ fontSize: 12, color: '#1A9E8A', fontWeight: 700 }}>dont 10 offerts ✅</div>
            </div>
          </div>

          {/* Barre progression */}
          <div style={{ marginTop: 20, background: '#F1F5F9', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg,#1A9E8A,#22C6AD,#EF4444)', borderRadius: 8 }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>
            <span>🎁 Gratuit (0-10)</span>
            <span>💰 Commission (11+)</span>
          </div>
        </div>

        {/* Méthodes de paiement */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,.05)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: '0 0 18px' }}>
            Choisissez votre mode de paiement
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {PAYMENT_METHODS.map(m => (
              <div key={m.id}
                onClick={() => m.available ? setMethod(m.id) : null}
                style={{
                  border: `2px solid ${selectedMethod === m.id ? m.color : '#E2E8F0'}`,
                  borderRadius: 14, padding: '16px', cursor: m.available ? 'pointer' : 'not-allowed',
                  background: selectedMethod === m.id ? m.bgColor : '#FAFAFA',
                  transition: 'all .18s', position: 'relative', opacity: m.available ? 1 : .7,
                }}>
                {/* Badge "Bientôt disponible" */}
                {!m.available && (
                  <div style={{ position: 'absolute', top: -8, right: 10, background: '#6B7280', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 9, fontWeight: 800, letterSpacing: '.04em' }}>
                    BIENTÔT
                  </div>
                )}
                <div style={{ fontSize: 28, marginBottom: 8 }}>{m.logo}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                  {m.available ? `Composer ${m.number}` : 'Paiement intégré bientôt'}
                </div>
              </div>
            ))}
          </div>

          {/* Instructions détaillées si méthode sélectionnée (toujours "bientôt" pour l'instant) */}
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 18px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>📋 Comment payer en attendant l'intégration</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { n:'1', t:'Contactez-nous', d:'Envoyez un SMS ou WhatsApp au +237 6XX XXX XXX' },
                { n:'2', t:'Effectuez le transfert', d:'Envoyez le montant dû via MTN MoMo ou Orange Money au numéro fourni' },
                { n:'3', t:'Partagez la référence', d:'Notez le code de transaction et soumettez-le ci-dessous' },
                { n:'4', t:'Déblocage sous 24h', d:'Notre équipe vérifie et débloque votre compte' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>{s.t}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Formulaire déclaration paiement */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,.05)', border: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: '0 0 6px' }}>Déclarer votre paiement</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 20px', lineHeight: 1.5 }}>
            Après avoir effectué le transfert, renseignez les informations ci-dessous. Notre équipe vérifiera et débloquera votre compte sous 24h.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Mode */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7 }}>
                Mode de paiement utilisé *
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${selectedMethod === m.id ? m.color : '#E2E8F0'}`, background: selectedMethod === m.id ? m.bgColor : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: selectedMethod === m.id ? '#1A1A1A' : '#94A3B8', transition: 'all .15s' }}>
                    {m.logo} {m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7 }}>
                Numéro utilisé pour le transfert *
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Ex: +237 6XX XXX XXX"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}/>
            </div>

            {/* Référence */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7 }}>
                Référence / Code de transaction *
              </label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                placeholder="Ex: CI210624.1532.A12345"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}/>
            </div>
          </div>

          {error && <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginTop: 14 }}>⚠️ {error}</div>}

          <button onClick={handleSubmitPayment} disabled={submitting}
            style={{ width: '100%', marginTop: 20, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {submitting
              ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }}/> Envoi…</>
              : '✅ Déclarer mon paiement'
            }
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 12 }}>
            Des questions ? <Link to="/contact" style={{ color: '#1A9E8A', fontWeight: 700 }}>Contactez-nous</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
