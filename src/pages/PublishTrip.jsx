import { API_URL, authFetch } from '../utils/api'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import CityAutocomplete from '../components/CityAutocomplete'
import TripMap from '../components/TripMap'
import DriverDocs from '../components/DriverDocs'
import PaymentWall from './PaymentWall'
import { suggestPriceCM, fmtFCFA } from '../data/cameroun'
// ── Config ────────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Itinéraire', icon: '🗺️',  desc: 'Où allez-vous ?' },
  { id: 1, label: 'Horaires',   icon: '🕐',  desc: 'Quand partez-vous ?' },
  { id: 2, label: 'Véhicule',   icon: '🚗',  desc: 'Votre voiture & documents' },
  { id: 3, label: 'Détails',    icon: '⚙️',  desc: 'Places & tarif' },
  { id: 4, label: 'Aperçu',     icon: '✅',  desc: 'Vérifiez & publiez' },
]

const PREF_OPTIONS = [
  { id: 'ac',        icon: '❄️', label: 'Climatisé' },
  { id: 'music',     icon: '🎵', label: 'Musique ok' },
  { id: 'pets',      icon: '🐾', label: 'Animaux ok' },
  { id: 'silent',    icon: '🤫', label: 'Silencieux' },
  { id: 'nosmoking', icon: '🚭', label: 'Non-fumeur' },
  { id: 'usb',       icon: '🔌', label: 'Chargeur USB' },
  { id: 'luggage',   icon: '🧳', label: 'Grand coffre' },
  { id: 'baby',      icon: '👶', label: 'Siège bébé' },
]

export default function PublishTrip() {
  const { t } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]       = useState(0)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [published, setPublished] = useState(false)

  // Freemium
  const [freemium, setFreemium] = useState(null)

  useEffect(() => {
    if (!user) return
    authFetch(`${API_URL}/api/freemium/status`, { })
      .then(r => r.json())
      .then(d => { if (d.success) setFreemium(d.freemium) })
      .catch(() => {})
  }, [user])

  // Infos conducteur (véhicule + docs)
  const [driverProfile, setDriverProfile] = useState(null)
  const [driverReady,   setDriverReady]   = useState(false) // a déjà validé l'étape véhicule

  useEffect(() => {
    if (!user) return
    authFetch(`${API_URL}/api/driver/profile`, { })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setDriverProfile(d.profile)
          // Pré-valider si véhicule + docs déjà renseignés
          const p = d.profile
          if (p.car_brand && p.car_model && p.car_color && p.license_doc && p.identity_doc) {
            setDriverReady(true)
          }
        }
      })
      .catch(() => {})
  }, [user])

  const [form, setForm] = useState({
    originCity: '', originAddress: '',
    destinationCity: '', destinationAddress: '',
    stops: [],
    date: '', time: '',
    seats: 1, price: '',
    prefs: [],
    description: '',
    instantBook: false,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setE = (k) => (e) => set(k, e.target.value)

  const suggestedPrice = form.originCity && form.destinationCity
    ? suggestPriceCM(form.originCity, form.destinationCity)
    : null

  // Validation by step
  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!form.originCity)      e.originCity      = 'Ville de départ requise'
      if (!form.destinationCity) e.destinationCity = "Ville d'arrivée requise"
      if (form.originCity === form.destinationCity && form.originCity) e.destinationCity = 'Départ et arrivée identiques'
    }
    if (step === 1) {
      if (!form.date) e.date = 'Date requise'
      if (!form.time) e.time = 'Heure requise'
      const today = new Date().toISOString().split('T')[0]
      if (form.date && form.date < today) e.date = 'La date doit être dans le futur'
    }
    // step 2 = véhicule → géré par DriverDocs, pas de validation ici
    if (step === 3) {
      if (!form.price || form.price < 500) e.price = 'Prix minimum : 500 FCFA'
      if (form.price > 50000) e.price = 'Prix maximum : 50 000 FCFA'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (step === 2) {
      // Étape véhicule : driverReady est mis à true par DriverDocs onComplete
      if (!driverReady) return // DriverDocs gère son propre affichage d'erreur
      setStep(s => s + 1)
      return
    }
    if (validate()) setStep(s => s + 1)
  }
  const prev = () => { setErrors({}); setStep(s => s - 1) }

  const nextStep = () => { if (validate()) setStep(s => s + 1) }
  const prevStep = () => { setErrors({}); setStep(s => s - 1) }

  const [publishError, setPublishError] = useState('')

  const handlePublish = async () => {
    setLoading(true)
    setPublishError('')
    try {
      // Combine date + time → ISO string
      const departureAt = form.date && form.time
        ? new Date(`${form.date}T${form.time}:00`).toISOString()
        : null

      if (!departureAt) {
        setPublishError('Date ou heure de départ manquante.')
        setLoading(false)
        return
      }

      // Convertit les ids de prefs en labels lisibles
      const prefLabels = form.prefs.map(id => {
        const found = PREF_OPTIONS.find(p => p.id === id)
        return found ? found.label : id
      })

      const res  = await authFetch(`${API_URL}/api/trips`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originCity:      form.originCity,
          originAddress:   form.originAddress || '',
          destinationCity: form.destinationCity,
          destinationAddress: form.destinationAddress || '',
          departureAt,
          availableSeats:  form.seats,
          pricePerSeat:    parseFloat(form.price),
          description:     form.description || '',
          preferences:     prefLabels,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setPublished(true)
      } else {
        setPublishError(data.message || 'Erreur lors de la publication.')
      }
    } catch {
      setPublishError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  const togglePref = (id) => set('prefs', form.prefs.includes(id) ? form.prefs.filter(x => x !== id) : [...form.prefs, id])

  // ── Bloqué pour impayé → afficher le mur de paiement ─────
  if (freemium?.isBlocked) {
    return <PaymentWall balanceDue={freemium.balanceDue} />
  }

  // ── Redirect si non connecté ───────────────────────
  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '40px 24px', textAlign: 'center', background: 'var(--bg)' }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em' }}>Connexion requise</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 360 }}>
          Vous devez être connecté pour publier un trajet.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login"><button className="btn-outline" style={{ padding: '12px 24px', fontSize: 15 }}>Se connecter</button></Link>
          <Link to="/register"><button className="btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>Créer un compte</button></Link>
        </div>
      </div>
    )
  }

  // ── Publication réussie ────────────────────────────
  if (published) {
    return (
      <>
        <style>{`@keyframes popIn { 0%{transform:scale(.8);opacity:0} 70%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }`}</style>
        <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 0, padding: '40px 24px', textAlign: 'center', background: 'linear-gradient(160deg,#e8f7f4 0%,var(--bg) 60%)' }}>
          <div style={{ animation: 'popIn .6s ease both' }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),#22C6AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, margin: '0 auto 24px', boxShadow: '0 12px 40px rgba(26,158,138,.35)' }}>✓</div>
            <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: 12 }}>
              Trajet publié ! 🎉
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 16px' }}>
              Votre trajet <strong>{form.originCity} → {form.destinationCity}</strong> est maintenant visible par des milliers de voyageurs.
            </p>
            <div style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 14, padding: '16px 24px', margin: '0 auto 32px', maxWidth: 320, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Récapitulatif</div>
              {[
                ['📍', `${form.originCity} → ${form.destinationCity}`],
                ['📅', `${form.date} à ${form.time}`],
                ['💺', `${form.seats} place${form.seats > 1 ? 's' : ''}`],
                ['💰', `${fmtFCFA(form.price)} / personne`],
              ].map(([icon, val]) => (
                <div key={val} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7, fontSize: 14, fontWeight: 600 }}>
                  <span>{icon}</span><span>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/"><button className="btn-outline" style={{ padding: '12px 24px', fontSize: 15 }}>← Accueil</button></Link>
              <button className="btn-primary" style={{ padding: '12px 24px', fontSize: 15 }} onClick={() => { setPublished(false); setStep(0); setForm({ originCity:'',originAddress:'',destinationCity:'',destinationAddress:'',stops:[],date:'',time:'',seats:1,price:'',prefs:[],description:'',instantBook:false }) }}>
                Publier un autre trajet
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        .pub-wrap {
          min-height: calc(100vh - 68px);
          background: var(--bg);
          padding: 40px 28px 80px;
        }
        .pub-container {
          max-width: 1060px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
          align-items: start;
        }

        /* ── Stepper ─────────────────────── */
        .stepper {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 36px;
          background: #fff;
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 6px;
          box-shadow: var(--shadow-xs);
        }
        .step-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all .2s;
        }
        .step-item.done   { background: var(--teal-light); }
        .step-item.active { background: linear-gradient(135deg,var(--teal),#22C6AD); }
        .step-item.active .step-label { color: #fff; }
        .step-item.active .step-num   { background: rgba(255,255,255,.25); color: #fff; }
        .step-item.active .step-sublabel { color: rgba(255,255,255,.75); }
        .step-num {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: var(--bg);
          color: var(--text-muted);
          font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all .2s;
        }
        .step-num.done { background: var(--teal); color: #fff; }
        .step-label    { font-size: 13px; font-weight: 700; color: var(--text); transition: color .2s; }
        .step-sublabel { font-size: 10px; color: var(--text-dim); margin-top: 1px; transition: color .2s; }

        /* ── Form card ───────────────────── */
        .form-card {
          background: #fff;
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 32px;
          box-shadow: var(--shadow-sm);
          animation: fadeUp .45s ease both;
        }
        .step-body { animation: slideIn .3s ease both; }

        /* ── Field ───────────────────────── */
        .field { margin-bottom: 20px; }
        .field-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 7px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .field-error { font-size: 12px; color: #ef4444; font-weight: 600; }
        .field-hint  { font-size: 11px; color: var(--text-dim); margin-top: 5px; }

        .city-select {
          background: var(--bg-input);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-size: 15px;
          font-weight: 600;
          width: 100%;
          padding: 13px 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          appearance: none;
          transition: border-color .2s, box-shadow .2s;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23A8A39E' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 14px;
        }
        .city-select:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px var(--teal-glow);
        }
        .city-select.error { border-color: #ef4444; }
        .city-select option { font-weight: 500; }

        /* ── Seat counter ────────────────── */
        .seat-counter {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--bg);
          border: 1.5px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 18px;
          width: fit-content;
        }
        .seat-btn {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: none;
          background: #fff;
          border: 1.5px solid var(--border);
          font-size: 18px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all .2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text);
        }
        .seat-btn:hover { border-color: var(--teal); color: var(--teal); }
        .seat-btn:disabled { opacity: .35; cursor: default; }
        .seat-value { font-size: 24px; font-weight: 800; min-width: 28px; text-align: center; }

        /* ── Price input ─────────────────── */
        .price-wrap { position: relative; }
        .price-symbol {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 17px; font-weight: 800;
          color: var(--teal);
          pointer-events: none;
        }

        /* ── Pref grid ───────────────────── */
        .pref-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .pref-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: #fff;
          cursor: pointer;
          transition: all .2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .pref-btn:hover { border-color: rgba(26,158,138,.35); background: var(--teal-light); }
        .pref-btn.active { border-color: var(--teal); background: var(--teal-light); }
        .pref-btn .pref-icon  { font-size: 20px; }
        .pref-btn .pref-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-align: center; }
        .pref-btn.active .pref-label { color: var(--teal-dark); }

        /* ── Navigation ──────────────────── */
        .form-nav {
          display: flex;
          gap: 10px;
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }

        /* ── Preview card ────────────────── */
        .preview-card {
          background: #fff;
          border: 1.5px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          position: sticky;
          top: 148px;
          box-shadow: var(--shadow-sm);
          animation: fadeUp .5s ease both;
        }
        .preview-header {
          background: linear-gradient(135deg, var(--teal), #22C6AD);
          padding: 20px 22px;
        }
        .preview-body { padding: 20px 22px; }
        .preview-row  { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; font-size: 13px; }
        .preview-icon { font-size: 15px; width: 20px; flex-shrink: 0; margin-top: 1px; }
        .preview-val  { font-weight: 600; }
        .preview-key  { font-size: 10px; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }

        /* ── Responsive ──────────────────── */
        @media (max-width: 900px) {
          .pub-container { grid-template-columns: 1fr; }
          .preview-card { position: static; }
          .stepper .step-sublabel { display: none; }
          .stepper .step-item { padding: 8px 10px; }
          .pref-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 600px) {
          .pub-wrap { padding: 24px 16px 60px; }
          .form-card { padding: 22px 18px; }
          .stepper { padding: 4px; gap: 4px; }
          .step-label { display: none; }
          .pref-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="pub-wrap">
        {/* Page header */}
        <div style={{ maxWidth: 1060, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-label orange" style={{ marginBottom: 10 }}>🚗 Conducteur</div>
            <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15 }}>
              Publiez votre trajet
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
              Remplissez les informations ci-dessous pour mettre votre trajet en ligne.
            </p>
          </div>
          <Link to="/">
            <button className="btn-ghost" style={{ fontSize: 14, padding: '8px 4px' }}>← Retour</button>
          </Link>
        </div>

        {/* Stepper */}
        <div style={{ maxWidth: 1060, margin: '0 auto 0' }}>
          <div className="stepper">
            {STEPS.map((s) => (
              <div key={s.id}
                className={`step-item${step === s.id ? ' active' : step > s.id ? ' done' : ''}`}
                onClick={() => step > s.id && setStep(s.id)}
                style={{ cursor: step > s.id ? 'pointer' : 'default' }}
              >
                <div className={`step-num${step > s.id ? ' done' : ''}`}>
                  {step > s.id ? '✓' : s.icon}
                </div>
                <div>
                  <div className="step-label">{s.label}</div>
                  <div className="step-sublabel">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="pub-container">

          {/* ── Left: Form ─────────────────── */}
          <div className="form-card">

            {/* STEP 0 — Itinéraire */}
            {step === 0 && (
              <div className="step-body">
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Votre itinéraire</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 26, lineHeight: 1.6 }}>Indiquez d'où vous partez et où vous allez.</p>

                <div className="field">
                  <div className="field-label">
                    Ville de départ
                    {errors.originCity && <span className="field-error">⚠ {errors.originCity}</span>}
                  </div>
                  <CityAutocomplete
                    value={form.originCity}
                    onChange={v => set('originCity', v)}
                    placeholder="Ex: Douala, Yaoundé..."
                    icon="📍"
                    inputStyle={{ padding:'13px 14px 13px 36px', borderColor: errors.originCity ? '#ef4444' : '' }}
                  />
                </div>

                <div className="field">
                  <div className="field-label">Point de départ précis <span style={{ color:'var(--text-dim)', fontWeight:400 }}>(optionnel)</span></div>
                  <input className="form-input" style={{ padding:'13px 14px' }} placeholder="Ex: Gare routière Bonabéri, Carrefour Elf..." value={form.originAddress} onChange={setE('originAddress')} />
                  <div className="field-hint">Aidez vos passagers à trouver le lieu de rendez-vous.</div>
                </div>

                {/* Flèche séparatrice */}
                <div style={{ display:'flex', alignItems:'center', gap:12, margin:'4px 0 20px', color:'var(--teal)' }}>
                  <div style={{ flex:1, height:1, background:'var(--border)' }} />
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--teal-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>↓</div>
                  <div style={{ flex:1, height:1, background:'var(--border)' }} />
                </div>

                <div className="field">
                  <div className="field-label">
                    Ville d'arrivée
                    {errors.destinationCity && <span className="field-error">⚠ {errors.destinationCity}</span>}
                  </div>
                  <CityAutocomplete
                    value={form.destinationCity}
                    onChange={v => set('destinationCity', v)}
                    placeholder="Ex: Bafoussam, Kribi..."
                    icon="🏁"
                    inputStyle={{ padding:'13px 14px 13px 36px', borderColor: errors.destinationCity ? '#ef4444' : '' }}
                  />
                </div>

                <div className="field">
                  <div className="field-label">Point d'arrivée précis <span style={{ color:'var(--text-dim)', fontWeight:400 }}>(optionnel)</span></div>
                  <input className="form-input" style={{ padding:'13px 14px' }} placeholder="Ex: Marché central, Hôtel des Brasseries..." value={form.destinationAddress} onChange={setE('destinationAddress')} />
                </div>

                {/* Aperçu carte si les deux villes sont renseignées */}
                {form.originCity && form.destinationCity && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:'#bbb', marginBottom:10 }}>
                      📍 Aperçu de l'itinéraire
                    </div>
                    <TripMap from={form.originCity} to={form.destinationCity} height={200} />
                  </div>
                )}
              </div>
            )}

            {/* STEP 1 — Date & heure */}
            {step === 1 && (
              <div className="step-body">
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Date et heure</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 26, lineHeight: 1.6 }}>Quand prévoyez-vous de partir ?</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="field">
                    <div className="field-label">
                      Date
                      {errors.date && <span className="field-error">⚠ {errors.date}</span>}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>📅</span>
                      <input type="date" className={`form-input${errors.date ? ' error' : ''}`}
                        style={{ padding: '13px 13px 13px 40px', borderColor: errors.date ? '#ef4444' : '' }}
                        min={new Date().toISOString().split('T')[0]}
                        value={form.date} onChange={setE('date')} />
                    </div>
                  </div>
                  <div className="field">
                    <div className="field-label">
                      Heure de départ
                      {errors.time && <span className="field-error">⚠ {errors.time}</span>}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🕐</span>
                      <input type="time" className={`form-input${errors.time ? ' error' : ''}`}
                        style={{ padding: '13px 13px 13px 40px', borderColor: errors.time ? '#ef4444' : '' }}
                        value={form.time} onChange={setE('time')} />
                    </div>
                  </div>
                </div>

                {/* Quick time slots */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Créneaux rapides</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['06:00', '07:30', '09:00', '12:00', '14:00', '17:00', '19:00'].map(t => (
                      <button key={t} type="button"
                        style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${form.time === t ? 'var(--teal)' : 'var(--border)'}`, background: form.time === t ? 'var(--teal-light)' : '#fff', color: form.time === t ? 'var(--teal-dark)' : 'var(--text-muted)', font: '600 13px "Plus Jakarta Sans"', cursor: 'pointer', transition: 'all .2s' }}
                        onClick={() => set('time', t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div style={{ background: 'var(--bg-teal)', border: '1px solid rgba(26,158,138,.2)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, color: 'var(--teal-dark)', fontWeight: 600, marginBottom: 6 }}>💡 Conseils pour plus de réservations</div>
                  <ul style={{ fontSize: 12, color: 'var(--teal-dark)', lineHeight: 1.8, paddingLeft: 16 }}>
                    <li>Les trajets du matin (7h-9h) sont les plus réservés</li>
                    <li>Publiez au moins 3 jours avant pour plus de visibilité</li>
                    <li>Les vendredis et dimanches sont très demandés</li>
                  </ul>
                </div>
              </div>
            )}

            {/* STEP 2 — Véhicule & Documents */}
            {step === 2 && (
              <div className="step-body">
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Votre voiture & documents</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                  Requis une seule fois. Ces informations seront mémorisées pour vos prochains trajets.
                </p>
                {driverReady && (
                  <div style={{ background: '#E8F7F4', border: '1.5px solid rgba(26,158,138,.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1A9E8A' }}>Informations déjà renseignées</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {driverProfile?.car_brand} {driverProfile?.car_model} · {driverProfile?.car_color}
                      </div>
                    </div>
                    <button type="button" onClick={() => setDriverReady(false)}
                      style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(0,0,0,.1)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                      Modifier
                    </button>
                  </div>
                )}
                {!driverReady && (
                  <DriverDocs
                    mode="publish"
                    initialData={driverProfile || {}}
                    onComplete={() => {
                      setDriverReady(true)
                      // Rafraîchir les données conducteur
                      authFetch(`${API_URL}/api/driver/profile`, { })
                        .then(r => r.json())
                        .then(d => { if (d.success) setDriverProfile(d.profile) })
                    }}
                  />
                )}
              </div>
            )}

            {/* STEP 3 — Détails */}
            {step === 3 && (
              <div className="step-body">
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Places et tarif</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 26, lineHeight: 1.6 }}>Définissez le nombre de places disponibles et votre prix.</p>

                {/* Seats */}
                <div className="field">
                  <div className="field-label">Nombre de places disponibles</div>
                  <div className="seat-counter">
                    <button className="seat-btn" type="button" disabled={form.seats <= 1} onClick={() => set('seats', form.seats - 1)}>−</button>
                    <div>
                      <div className="seat-value">{form.seats}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', fontWeight: 500 }}>place{form.seats > 1 ? 's' : ''}</div>
                    </div>
                    <button className="seat-btn" type="button" disabled={form.seats >= 7} onClick={() => set('seats', form.seats + 1)}>+</button>
                  </div>
                  <div className="field-hint">Maximum 7 places passagers.</div>
                </div>

                {/* Price */}
                <div className="field">
                  <div className="field-label">
                    Prix par passager
                    {errors.price && <span className="field-error">⚠ {errors.price}</span>}
                  </div>
                  <div className="price-wrap">
                    <span className="price-symbol" style={{ fontSize:11, fontWeight:800, letterSpacing:'-.01em' }}>FCFA</span>
                    <input type="number" className={`form-input${errors.price ? ' error' : ''}`}
                      style={{ padding: '13px 14px 13px 56px', fontSize: 20, fontWeight: 800, borderColor: errors.price ? '#ef4444' : '' }}
                      placeholder="3000"
                      min="500" max="50000" step="100"
                      value={form.price} onChange={setE('price')} />
                  </div>
                  {suggestedPrice && !form.price && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Prix suggéré :</span>
                      <button type="button" onClick={() => set('price', suggestedPrice)}
                        style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', border: '1px solid rgba(26,158,138,.2)', borderRadius: 6, padding: '3px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {fmtFCFA(suggestedPrice)}
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>basé sur ce trajet</span>
                    </div>
                  )}
                  <div className="field-hint">
                    Commission Clando : 10% · Vous recevrez {form.price ? fmtFCFA(Math.round(form.price * 0.9)) : '—'} par réservation.
                  </div>
                </div>

                {/* Prefs */}
                <div className="field">
                  <div className="field-label">Préférences de voyage</div>
                  <div className="pref-grid">
                    {PREF_OPTIONS.map(p => (
                      <button key={p.id} type="button" className={`pref-btn${form.prefs.includes(p.id) ? ' active' : ''}`} onClick={() => togglePref(p.id)}>
                        <span className="pref-icon">{p.icon}</span>
                        <span className="pref-label">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="field">
                  <div className="field-label">Message pour les passagers <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optionnel)</span></div>
                  <textarea className="form-input" style={{ padding: '13px 14px', minHeight: 90, resize: 'vertical' }}
                    placeholder="Ex: Départ exact à l'heure, voiture spacieuse, ambiance détendue !"
                    value={form.description} onChange={setE('description')} />
                </div>

                {/* Instant book */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: 'var(--bg)', borderRadius: 12, padding: '14px 16px', border: '1.5px solid var(--border)' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--teal)', width: 18, height: 18, marginTop: 1, flexShrink: 0 }} checked={form.instantBook} onChange={e => set('instantBook', e.target.checked)} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>⚡ Réservation instantanée</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>Les passagers peuvent réserver sans votre confirmation préalable. Recommandé pour plus de réservations.</div>
                  </div>
                </label>
              </div>
            )}

            {/* STEP 4 — Aperçu */}
            {step === 4 && (
              <div className="step-body">
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Vérifiez avant de publier</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 26 }}>Voilà à quoi ressemblera votre annonce pour les voyageurs.</p>

                {/* Preview listing mockup */}
                <div style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '20px 22px', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                    {/* Time */}
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em' }}>{form.time || '--:--'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{form.date || '-- --- ----'}</div>
                    </div>
                    {/* Route */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div><div style={{ fontWeight: 700 }}>{form.originCity || '?'}</div><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{form.originAddress || ''}</div></div>
                      <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,var(--teal),rgba(26,158,138,.15))', borderRadius: 2, position: 'relative' }}>
                        <div style={{ position: 'absolute', right: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--teal)', border: '2px solid #fff' }} />
                      </div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700 }}>{form.destinationCity || '?'}</div><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{form.destinationAddress || ''}</div></div>
                    </div>
                    {/* Price */}
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--teal)' }}>{form.price || '--'}€</div>
                  </div>
                  {/* Prefs */}
                  {form.prefs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {form.prefs.map(id => {
                        const p = PREF_OPTIONS.find(x => x.id === id)
                        return p ? <span key={id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 600, padding: '4px 9px', color: 'var(--text-muted)' }}>{p.icon} {p.label}</span> : null
                      })}
                    </div>
                  )}
                </div>

                {/* Summary checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {[
                    { label: 'Itinéraire', val: form.originCity && form.destinationCity ? `${form.originCity} → ${form.destinationCity}` : null, icon: '🗺️' },
                    { label: 'Date & heure', val: form.date && form.time ? `${form.date} à ${form.time}` : null, icon: '📅' },
                    { label: 'Places', val: `${form.seats} place${form.seats > 1 ? 's' : ''}`, icon: '💺' },
                    { label: 'Prix', val: form.price ? `${form.price}€ / personne` : null, icon: '💶' },
                    { label: 'Réservation', val: form.instantBook ? 'Instantanée ⚡' : 'Avec confirmation', icon: '📋' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: row.val ? 'var(--teal-light)' : '#fff5f5', border: `1px solid ${row.val ? 'rgba(26,158,138,.2)' : 'rgba(239,68,68,.2)'}`, borderRadius: 10 }}>
                      <span style={{ fontSize: 18 }}>{row.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{row.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: row.val ? 'var(--text)' : '#ef4444' }}>{row.val || '⚠ Non renseigné'}</div>
                      </div>
                      <span style={{ fontSize: 16 }}>{row.val ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>

                {/* Legal note */}
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  🔒 En publiant, vous acceptez nos <a href="#" style={{ color: 'var(--teal)', fontWeight: 600 }}>conditions de publication</a>. Le covoiturage doit être non-lucratif : vous ne pouvez pas dépasser vos frais de trajet.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-nav">
              {step > 0 ? (
                <button type="button" className="btn-outline" style={{ padding: '13px 22px', fontSize: 14 }} onClick={prev}>
                  ← Retour
                </button>
              ) : (
                <Link to="/"><button type="button" className="btn-ghost" style={{ padding: '13px 4px', fontSize: 14 }}>Annuler</button></Link>
              )}

              {/* Étape véhicule : bouton Continuer désactivé si pas encore validé */}
              {step === 2 && driverReady && (
                <button type="button" className="btn-primary" style={{ flex: 1, padding: '14px', fontSize: 15 }} onClick={next}>
                  Continuer →
                </button>
              )}
              {step === 2 && !driverReady && (
                <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, color: '#94A3B8', textAlign: 'center' }}>
                  Complétez les informations ci-dessus
                </div>
              )}

              {step < 2 && (
                <button type="button" className="btn-primary" style={{ flex: 1, padding: '14px', fontSize: 15 }} onClick={next}>
                  Continuer →
                </button>
              )}

              {step === 3 && (
                <button type="button" className="btn-primary" style={{ flex: 1, padding: '14px', fontSize: 15 }} onClick={next}>
                  Continuer →
                </button>
              )}

              {step === 4 && (
                <>
                  {publishError && (
                    <div style={{ width:'100%', background:'#fef2f2', border:'1.5px solid rgba(239,68,68,.2)', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#dc2626', marginBottom:4 }}>
                      ⚠️ {publishError}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-orange"
                    style={{ flex: 1, padding: '14px', fontSize: 15 }}
                    onClick={handlePublish}
                    disabled={loading}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin .8s linear infinite' }} />
                        Publication...
                      </span>
                    ) : '🚀 Publier mon trajet'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Right: Live preview ───────── */}
          <div className="preview-card">
            <div className="preview-header">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Aperçu en direct</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>
                {form.originCity || '?'} → {form.destinationCity || '?'}
              </div>
              {form.date && form.time && (
                <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 13, marginTop: 3 }}>
                  {form.date} · {form.time}
                </div>
              )}
            </div>

            <div className="preview-body">
              {/* Driver */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),#22C6AD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0 }}>
                  {user?.avatar || user?.name?.[0]?.toUpperCase() || 'V'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name || 'Vous'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Conducteur · ⭐ {user?.rating || '5.0'}</div>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                {[
                  { icon: '📍', key: 'Départ',      val: form.originCity      ? `${form.originCity}${form.originAddress      ? ` · ${form.originAddress}`      : ''}` : '—' },
                  { icon: '🏁', key: 'Arrivée',     val: form.destinationCity ? `${form.destinationCity}${form.destinationAddress ? ` · ${form.destinationAddress}` : ''}` : '—' },
                  { icon: '💺', key: 'Places',      val: `${form.seats} place${form.seats > 1 ? 's' : ''} libre${form.seats > 1 ? 's' : ''}` },
                  { icon: '💰', key: 'Prix',        val: form.price ? fmtFCFA(parseFloat(form.price)) + ' / pers.' : '—' },
                  { icon: '⚡', key: 'Réservation', val: form.instantBook ? 'Instantanée' : 'Avec confirmation' },
                  ...(driverProfile?.car_brand ? [{ icon: '🚗', key: 'Voiture', val: `${driverProfile.car_brand} ${driverProfile.car_model} · ${driverProfile.car_color}` }] : []),
                ].map(r => (
                  <div key={r.key} className="preview-row">
                    <span className="preview-icon">{r.icon}</span>
                    <div>
                      <div className="preview-key">{r.key}</div>
                      <div className="preview-val" style={{ color: r.val === '—' ? 'var(--text-dim)' : 'var(--text)' }}>{r.val}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prefs */}
              {form.prefs.length > 0 && (
                <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Préférences</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {form.prefs.map(id => {
                      const p = PREF_OPTIONS.find(x => x.id === id)
                      return p ? <span key={id} style={{ background: 'var(--teal-light)', color: 'var(--teal-dark)', border: '1px solid rgba(26,158,138,.2)', borderRadius: 6, fontSize: 11, fontWeight: 600, padding: '3px 8px' }}>{p.icon} {p.label}</span> : null
                    })}
                  </div>
                </div>
              )}

              {/* Revenue estimate */}
              {form.price && form.seats && (
                <div style={{ marginTop: 16, background: 'var(--orange-light)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange-dark)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>💰 Estimation gains</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange-dark)' }}>
                    {fmtFCFA(Math.round(parseFloat(form.price) * form.seats * 0.9))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--orange-dark)', opacity: .75 }}>
                    si {form.seats} place{form.seats > 1 ? 's réservées' : ' réservée'} (après frais 10%)
                  </div>
                </div>
              )}

              {/* Statut documents */}
              {driverProfile && (
                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Documents</div>
                  {[
                    { icon: '🪪', label: 'Permis de conduire', ok: !!driverProfile.license_doc },
                    { icon: '🆔', label: 'Pièce d\'identité',  ok: !!driverProfile.identity_doc },
                  ].map(d => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{d.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: d.ok ? '#1A9E8A' : '#94A3B8', flex: 1 }}>{d.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: d.ok ? '#1A9E8A' : '#EF4444' }}>{d.ok ? '✅' : '❌'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
