import { useState, useRef } from 'react'
import { API_URL, authFetch } from '../utils/api'

// ── Marques populaires au Cameroun ───────────────────────────
const CAR_BRANDS = [
  'Toyota','Hyundai','Kia','Mitsubishi','Nissan','Honda',
  'Suzuki','Mazda','Peugeot','Renault','Mercedes-Benz',
  'BMW','Ford','Chevrolet','Daewoo','Isuzu','Land Rover',
  'Volvo','Volkswagen','Fiat','Autre',
]

const CAR_COLORS = [
  { label: 'Blanc',       hex: '#FFFFFF', border: true },
  { label: 'Noir',        hex: '#1A1A1A' },
  { label: 'Gris',        hex: '#9CA3AF' },
  { label: 'Argent',      hex: '#CBD5E1' },
  { label: 'Rouge',       hex: '#EF4444' },
  { label: 'Bleu',        hex: '#3B82F6' },
  { label: 'Vert',        hex: '#22C55E' },
  { label: 'Jaune',       hex: '#EAB308' },
  { label: 'Orange',      hex: '#FF6B35' },
  { label: 'Beige',       hex: '#D4B896' },
  { label: 'Marron',      hex: '#92400E' },
  { label: 'Bordeaux',    hex: '#881337' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 25 }, (_, i) => CURRENT_YEAR - i)

// ── Composant zone de dépôt de fichier ────────────────────────
function FileDropZone({ label, icon, name, file, onChange, accept = 'image/*,.pdf' }) {
  const inputRef = useRef(null)
  const [drag,   setDrag]   = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) onChange(name, f)
  }

  const isImage = file?.type?.startsWith('image/')

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {icon} {label} <span style={{ color: '#EF4444' }}>*</span>
      </div>

      {file ? (
        /* Aperçu fichier sélectionné */
        <div style={{ border: '1.5px solid rgba(26,158,138,.4)', borderRadius: 12, padding: '12px 16px', background: '#E8F7F4', display: 'flex', alignItems: 'center', gap: 12 }}>
          {isImage ? (
            <img src={URL.createObjectURL(file)} alt="aperçu"
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}/>
          ) : (
            <div style={{ width: 52, height: 52, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📄</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div style={{ fontSize: 11, color: '#1A9E8A', marginTop: 2, fontWeight: 600 }}>✅ Fichier prêt</div>
          </div>
          <button type="button" onClick={() => onChange(name, null)}
            style={{ background: 'rgba(239,68,68,.1)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#EF4444', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>
            Changer
          </button>
        </div>
      ) : (
        /* Zone de dépôt */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${drag ? '#1A9E8A' : 'rgba(0,0,0,.15)'}`,
            borderRadius: 12, padding: '24px 20px', textAlign: 'center',
            cursor: 'pointer', background: drag ? '#E8F7F4' : '#FAFAF7',
            transition: 'all .18s',
          }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
            Glissez votre fichier ici
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
            ou cliquez pour parcourir · JPG, PNG, PDF · Images : 5 Mo max · PDF : 10 Mo max
          </div>
          <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
            onChange={e => onChange(name, e.target.files[0] || null)} />
        </div>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function DriverDocs({
  mode = 'publish',     // 'register' | 'publish'
  onComplete,           // callback quand tout est sauvegardé
  initialData = {},     // données déjà renseignées (prefill)
}) {
  const [vehicle, setVehicle] = useState({
    carBrand: initialData.car_brand || '',
    carModel: initialData.car_model || '',
    carColor: initialData.car_color || '',
    carYear:  initialData.car_year  || '',
    carPlate: initialData.car_plate || '',
  })

  const [files, setFiles] = useState({ license_doc: null, identity_doc: null })
  const [alreadyHas, setAlreadyHas] = useState({
    license:  !!initialData.license_doc,
    identity: !!initialData.identity_doc,
  })

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const setV   = (k) => (e) => setVehicle(v => ({ ...v, [k]: e.target.value || e }))
  const setFile = (name, f) => {
    if (f) {
      const isPdf   = f.type === 'application/pdf'
      const maxSize = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024
      const maxLabel = isPdf ? '10 Mo' : '5 Mo'
      if (f.size > maxSize) {
        setError(`"${f.name}" dépasse la limite autorisée (${maxLabel} pour ${isPdf ? 'les PDF' : 'les images'}).`)
        return
      }
    }
    setError('')
    setFiles(prev => ({ ...prev, [name]: f }))
  }

  const docsRequired = !alreadyHas.license || !alreadyHas.identity

  const handleSave = async () => {
    setError('')
    // Validation véhicule
    if (!vehicle.carBrand || !vehicle.carModel || !vehicle.carColor) {
      setError('Marque, modèle et couleur de la voiture sont requis.')
      return
    }
    // Validation documents
    if (!alreadyHas.license && !files.license_doc) {
      setError('Veuillez fournir votre permis de conduire.')
      return
    }
    if (!alreadyHas.identity && !files.identity_doc) {
      setError('Veuillez fournir votre pièce d\'identité.')
      return
    }

    setSaving(true)
    try {
      // 1. Sauvegarder les infos véhicule
      const vRes = await authFetch(`${API_URL}/api/driver/vehicle`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      })
      const vData = await vRes.json()
      if (!vData.success) { setError(vData.message); setSaving(false); return }

      // 2. Uploader les documents si nécessaire
      const hasNewFiles = files.license_doc || files.identity_doc
      if (hasNewFiles) {
        const fd = new FormData()
        if (files.license_doc)  fd.append('license_doc',  files.license_doc)
        if (files.identity_doc) fd.append('identity_doc', files.identity_doc)

        const dRes = await authFetch(`${API_URL}/api/driver/documents`, {
          method: 'POST', credentials: 'include', body: fd,
        })
        const dData = await dRes.json()
        if (!dData.success) { setError(dData.message); setSaving(false); return }
      }

      setSuccess('Informations enregistrées ✅')
      setTimeout(() => {
        setSuccess('')
        onComplete?.()
      }, 800)
    } catch {
      setError('Impossible de contacter le serveur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Informations véhicule ── */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>
          🚗 Informations sur votre véhicule
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
          Ces informations permettent aux passagers de vous identifier facilement.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Marque */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
              Marque <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select value={vehicle.carBrand}
              onChange={e => setVehicle(v => ({ ...v, carBrand: e.target.value }))}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: vehicle.carBrand ? '#1A1A1A' : '#9CA3AF', outline: 'none', cursor: 'pointer' }}>
              <option value="">Choisir une marque…</option>
              {CAR_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Modèle */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
              Modèle <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="text" value={vehicle.carModel}
              onChange={setV('carModel')}
              placeholder="Ex: Corolla, Accent, C3…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1A1A1A' }}/>
          </div>

          {/* Année */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
              Année <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optionnel)</span>
            </label>
            <select value={vehicle.carYear}
              onChange={e => setVehicle(v => ({ ...v, carYear: e.target.value }))}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#1A1A1A', outline: 'none', cursor: 'pointer' }}>
              <option value="">Année…</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Plaque */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>
              Plaque d'immatriculation <span style={{ color: '#94A3B8', fontWeight: 500 }}>(optionnel)</span>
            </label>
            <input type="text" value={vehicle.carPlate}
              onChange={setV('carPlate')}
              placeholder="Ex: LT 1234 A"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1A1A1A', textTransform: 'uppercase' }}/>
          </div>
        </div>

        {/* Couleur */}
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 10 }}>
            Couleur <span style={{ color: '#EF4444' }}>*</span>
            {vehicle.carColor && <span style={{ marginLeft: 8, color: '#1A9E8A', fontWeight: 700, textTransform: 'none' }}> — {vehicle.carColor}</span>}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CAR_COLORS.map(c => {
              const selected = vehicle.carColor === c.label
              return (
                <button key={c.label} type="button"
                  onClick={() => setVehicle(v => ({ ...v, carColor: c.label }))}
                  title={c.label}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: c.hex, border: 'none', cursor: 'pointer',
                    outline: selected ? '3px solid #1A9E8A' : c.border ? '1.5px solid rgba(0,0,0,.15)' : '2px solid transparent',
                    outlineOffset: selected ? 3 : 0,
                    transition: 'all .15s',
                    boxShadow: selected ? '0 2px 8px rgba(26,158,138,.4)' : 'none',
                  }}/>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(0,0,0,.07)' }}/>

      {/* ── Documents ── */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>
          📄 Documents d'identification
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
          {mode === 'publish'
            ? 'Requis pour publier un trajet. Vos documents sont vérifiés par notre équipe sous 24h.'
            : 'Facultatif maintenant, mais obligatoire avant de publier un trajet.'}
        </div>

        {/* Badge déjà envoyés */}
        {(alreadyHas.license || alreadyHas.identity) && (
          <div style={{ background: '#E8F7F4', border: '1px solid rgba(26,158,138,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1A9E8A', fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }}>
            ✅ Documents déjà envoyés — vous pouvez en ajouter de nouveaux si nécessaire.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Permis — 3 états mutuellement exclusifs */}
          {!alreadyHas.license && (
            <FileDropZone label="Permis de conduire" icon="🪪" name="license_doc"
              file={files.license_doc} onChange={setFile} />
          )}
          {alreadyHas.license && !files.license_doc && (
            <div style={{ border: '1.5px solid rgba(26,158,138,.3)', borderRadius: 12, padding: '12px 16px', background: '#E8F7F4', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🪪</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Permis de conduire</div>
                  <div style={{ fontSize: 11, color: '#1A9E8A', fontWeight: 600 }}>✅ Déjà envoyé</div>
                </div>
              </div>
              <button type="button" onClick={() => setAlreadyHas(a => ({ ...a, license: false }))}
                style={{ background: 'none', border: '1px solid rgba(0,0,0,.12)', borderRadius: 7, padding: '5px 10px', fontSize: 11, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                Remplacer
              </button>
            </div>
          )}
          {alreadyHas.license && files.license_doc && (
            <FileDropZone label="Nouveau permis de conduire" icon="🪪" name="license_doc"
              file={files.license_doc} onChange={setFile} />
          )}

          {/* Pièce d'identité */}
          {!alreadyHas.identity && (
            <FileDropZone label="Pièce d'identité (CNI ou Passeport)" icon="🆔" name="identity_doc"
              file={files.identity_doc} onChange={setFile} />
          )}
          {alreadyHas.identity && !files.identity_doc && (
            <div style={{ border: '1.5px solid rgba(26,158,138,.3)', borderRadius: 12, padding: '12px 16px', background: '#E8F7F4', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🆔</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Pièce d'identité</div>
                  <div style={{ fontSize: 11, color: '#1A9E8A', fontWeight: 600 }}>✅ Déjà envoyée</div>
                </div>
              </div>
              <button type="button" onClick={() => setAlreadyHas(a => ({ ...a, identity: false }))}
                style={{ background: 'none', border: '1px solid rgba(0,0,0,.12)', borderRadius: 7, padding: '5px 10px', fontSize: 11, color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                Remplacer
              </button>
            </div>
          )}
        </div>

        {/* Note confidentialité */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 12, color: '#6B7280', display: 'flex', gap: 8 }}>
          <span>🔒</span>
          <span>Vos documents sont chiffrés et accessibles uniquement par notre équipe de vérification. Ils ne sont jamais partagés avec d'autres utilisateurs.</span>
        </div>
      </div>

      {/* ── Erreur / Succès ── */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#DC2626', fontWeight: 600, display: 'flex', gap: 8 }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#E8F7F4', border: '1.5px solid rgba(26,158,138,.2)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#1A9E8A', fontWeight: 700, textAlign: 'center' }}>
          {success}
        </div>
      )}

      {/* ── Bouton ── */}
      <button type="button" onClick={handleSave} disabled={saving}
        style={{
          width: '100%', padding: '13px', borderRadius: 12,
          background: saving ? '#ccc' : 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
          border: 'none', color: '#fff', fontSize: 15, fontWeight: 800,
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'opacity .18s',
        }}>
        {saving
          ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }}/> Enregistrement…</>
          : mode === 'register' ? 'Enregistrer (optionnel)' : '✅ Enregistrer et continuer'
        }
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </button>

      {mode === 'register' && (
        <button type="button" onClick={() => onComplete?.()}
          style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'none', border: '1.5px solid rgba(0,0,0,.1)', color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Passer pour l'instant →
        </button>
      )}
    </div>
  )
}
