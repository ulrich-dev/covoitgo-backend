import { useState, useRef, useCallback, useEffect } from 'react'
import { API_URL } from '../utils/api'

/**
 * AvatarUpload — composant complet
 *
 * Fonctionnalités :
 * ─ Clic sur la photo → visionneuse plein écran (lightbox)
 * ─ Bouton ✏️ → ouvre l'éditeur de personnalisation
 * ─ Éditeur : zoom slider + drag pour repositionner
 * ─ Upload vers /api/auth/avatar
 * ─ Suppression de photo
 *
 * Props :
 *   user      — { firstName, avatarColor, avatarUrl }
 *   size      — taille en px (défaut 88)
 *   onUpload  — callback(newUrl) après upload réussi
 *   editable  — booléen (défaut true)
 */
export default function AvatarUpload({ user, size = 88, onUpload, editable = true }) {
  // ── États ──────────────────────────────────────────────────
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState('')
  const [lightbox,   setLightbox]   = useState(false)   // visionneuse plein écran
  const [editor,     setEditor]     = useState(false)   // modal d'édition
  const [editorImg,  setEditorImg]  = useState(null)    // data URL de l'image en cours d'édition
  const [editorFile, setEditorFile] = useState(null)    // File à uploader
  const [zoom,       setZoom]       = useState(1)       // 1 = 100%, 2 = 200%…
  const [offset,     setOffset]     = useState({ x: 0, y: 0 })   // décalage en px
  const [dragging,   setDragging]   = useState(false)
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 })

  const inputRef   = useRef(null)
  const previewRef = useRef(null)

  // URL courante de la photo
  // Si avatarUrl commence par /uploads/ → fichier local → préfixer avec l'URL du backend
  // Si c'est une URL complète (Google/Facebook) → utiliser directement
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const photoUrl = user?.avatarUrl
    ? (user.avatarUrl.startsWith('http')
        ? user.avatarUrl                         // URL OAuth externe (Google, Facebook)
        : `${BACKEND_URL}${user.avatarUrl}`)     // Fichier local uploadé
    : null

  const initials = user?.firstName?.[0]?.toUpperCase() || '?'
  const bgColor  = user?.avatarColor || '#1A9E8A'

  // ── Ouvrir le sélecteur de fichier ─────────────────────────
  const pickFile = () => { setError(''); inputRef.current?.click() }

  // ── Fichier sélectionné → ouvrir éditeur ───────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError('Fichier trop lourd (max 8 Mo).'); return }
    if (!file.type.startsWith('image/')) { setError('Format invalide. Utilisez JPG, PNG ou WEBP.'); return }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setEditorImg(ev.target.result)
      setEditorFile(file)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setEditor(true)
    }
    reader.readAsDataURL(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Drag dans l'éditeur ─────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    e.preventDefault()
  }, [offset])

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [dragging, dragStart])

  const onMouseUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup',   onMouseUp)
      return () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup',   onMouseUp)
      }
    }
  }, [dragging, onMouseMove, onMouseUp])

  // Touch support
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y })
  }, [offset])

  const onTouchMove = useCallback((e) => {
    if (!dragging) return
    const t = e.touches[0]
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y })
  }, [dragging, dragStart])

  // ── Générer le canvas rogné et uploader ─────────────────────
  const handleSave = async () => {
    setUploading(true); setError('')
    try {
      // Dessiner le canvas avec le zoom/offset
      const CANVAS_SIZE = 400
      const canvas = document.createElement('canvas')
      canvas.width  = CANVAS_SIZE
      canvas.height = CANVAS_SIZE
      const ctx = canvas.getContext('2d')

      // Fond de la couleur du profil
      ctx.fillStyle = bgColor
      ctx.beginPath()
      ctx.arc(CANVAS_SIZE/2, CANVAS_SIZE/2, CANVAS_SIZE/2, 0, Math.PI*2)
      ctx.fill()

      // Charger l'image
      const img = new Image()
      img.src = editorImg
      await new Promise((resolve) => { img.onload = resolve })

      // Clip en cercle
      ctx.save()
      ctx.beginPath()
      ctx.arc(CANVAS_SIZE/2, CANVAS_SIZE/2, CANVAS_SIZE/2, 0, Math.PI*2)
      ctx.clip()

      // Calculer dimensions avec zoom
      const scaledW = img.width  * zoom * (CANVAS_SIZE / Math.min(img.width, img.height))
      const scaledH = img.height * zoom * (CANVAS_SIZE / Math.min(img.width, img.height))
      const x = (CANVAS_SIZE - scaledW) / 2 + offset.x
      const y = (CANVAS_SIZE - scaledH) / 2 + offset.y

      ctx.drawImage(img, x, y, scaledW, scaledH)
      ctx.restore()

      // Convertir en Blob
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      const fd = new FormData()
      fd.append('avatar', blob, 'avatar.jpg')

      const res  = await fetch(`${API_URL}/api/auth/avatar`, {
        method: 'POST', credentials: 'include', body: fd,
      })
      const data = await res.json()

      if (data.success) {
        setEditor(false)
        onUpload?.(data.avatarUrl)
      } else {
        setError(data.message || 'Erreur lors de l\'upload.')
      }
    } catch (err) {
      setError('Impossible de contacter le serveur.')
    } finally {
      setUploading(false)
    }
  }

  // ── Supprimer la photo ─────────────────────────────────────
  const handleDelete = async () => {
    try {
      const res  = await fetch(`${API_URL}/api/auth/avatar`, {
        method: 'DELETE', credentials: 'include',
      })
      const data = await res.json()
      if (data.success) { setEditor(false); onUpload?.(null) }
    } catch { setError('Erreur serveur.') }
  }

  // ════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════
  return (
    <>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        .av-avatar:hover .av-overlay { opacity:1 !important; }
      `}</style>

      {/* ── Avatar principal ── */}
      <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
        <div className="av-avatar"
          style={{ width: size, height: size, borderRadius: '50%', position: 'relative',
            cursor: photoUrl || editable ? 'pointer' : 'default',
            border: '3px solid rgba(255,255,255,.9)',
            boxShadow: '0 4px 18px rgba(0,0,0,.15)', overflow: 'hidden',
            background: photoUrl ? 'transparent' : bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { if (photoUrl) setLightbox(true) }}
        >
          {photoUrl
            ? <img src={photoUrl} alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'}
              />
            : <span style={{ color: '#fff', fontWeight: 900, fontSize: size * 0.38 }}>{initials}</span>
          }

          {/* Overlay loupe si photo */}
          {photoUrl && (
            <div className="av-overlay"
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity .2s', fontSize: size * 0.28 }}>
              🔍
            </div>
          )}
        </div>

        {/* Bouton ✏️ édition */}
        {editable && (
          <button onClick={pickFile}
            title="Modifier la photo"
            style={{
              position: 'absolute', bottom: -2, right: -2,
              width: Math.max(28, size * 0.34), height: Math.max(28, size * 0.34),
              borderRadius: '50%', border: '2.5px solid #fff',
              background: 'linear-gradient(135deg,#1A9E8A,#22C6AD)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.max(12, size * 0.17), cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,.2)', transition: 'transform .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {uploading ? '⏳' : '✏️'}
          </button>
        )}

        {error && !editor && (
          <div style={{ position: 'absolute', top: size + 10, left: '50%', transform: 'translateX(-50%)',
            whiteSpace: 'nowrap', background: '#FEF2F2', color: '#DC2626',
            borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,.1)', zIndex: 20 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Input caché */}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile} style={{ display: 'none' }}/>

      {/* ══════════════════════════════════════
          LIGHTBOX — visionneuse plein écran
      ══════════════════════════════════════ */}
      {lightbox && photoUrl && (
        <div
          onClick={() => setLightbox(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn .2s ease', cursor: 'zoom-out',
          }}
        >
          <div style={{ position: 'relative', animation: 'scaleIn .25s ease' }}
            onClick={e => e.stopPropagation()}>
            <img src={photoUrl} alt="Photo de profil"
              style={{ maxWidth: 'min(80vw, 480px)', maxHeight: '80vh',
                borderRadius: '50%', objectFit: 'cover',
                width: 'min(80vw, 420px)', height: 'min(80vw, 420px)',
                boxShadow: '0 24px 80px rgba(0,0,0,.6)',
                border: '4px solid rgba(255,255,255,.15)',
              }}/>
            <button onClick={() => setLightbox(false)}
              style={{ position: 'absolute', top: -16, right: -16,
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,.15)', border: '2px solid rgba(255,255,255,.3)',
                color: '#fff', fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            {editable && (
              <button onClick={() => { setLightbox(false); pickFile() }}
                style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(26,158,138,.9)', color: '#fff',
                  border: 'none', borderRadius: 24, padding: '10px 22px',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                  backdropFilter: 'blur(4px)',
                }}>
                ✏️ Modifier la photo
              </button>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,.5)',
            fontSize: 12, fontWeight: 600, letterSpacing: '.04em' }}>
            Cliquez en dehors pour fermer
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ÉDITEUR — personnalisation zoom/position
      ══════════════════════════════════════ */}
      {editor && editorImg && (
        <div onClick={() => { if (!uploading) { setEditor(false); setError('') } }}
          style={{ position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(0,0,0,.80)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn .2s ease',
          }}
        >
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 24, padding: '28px',
              width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.4)',
              animation: 'scaleIn .25s ease', fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
                Personnaliser la photo
              </h2>
              <button onClick={() => { setEditor(false); setError('') }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>
                ✕
              </button>
            </div>

            {/* Aperçu circulaire avec drag */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              <div style={{ position: 'relative', width: 220, height: 220,
                borderRadius: '50%', overflow: 'hidden',
                border: '3px solid #1A9E8A',
                boxShadow: '0 0 0 4px rgba(26,158,138,.15)',
                cursor: dragging ? 'grabbing' : 'grab',
                userSelect: 'none', background: bgColor,
              }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={() => setDragging(false)}
              >
                <img src={editorImg} alt="preview"
                  draggable={false}
                  style={{
                    position: 'absolute',
                    width:  `${zoom * 100}%`,
                    height: `${zoom * 100}%`,
                    left:   `calc(50% - ${zoom * 50}% + ${offset.x}px)`,
                    top:    `calc(50% - ${zoom * 50}% + ${offset.y}px)`,
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    transition: dragging ? 'none' : 'left .1s, top .1s',
                  }}/>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, margin: 0, textAlign: 'center' }}>
                Glissez pour repositionner · Zoomez avec le curseur ci-dessous
              </p>
            </div>

            {/* Contrôles */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#64748B',
                  textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Zoom
                </label>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A9E8A' }}>
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <input type="range" min="0.5" max="3" step="0.01"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#1A9E8A', cursor: 'pointer', height: 5 }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#CBD5E1' }}>50%</span>
                <span style={{ fontSize: 10, color: '#CBD5E1' }}>300%</span>
              </div>
            </div>

            {/* Bouton centrer */}
            <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}
              style={{ width: '100%', padding: '9px', borderRadius: 9,
                border: '1.5px solid rgba(0,0,0,.1)', background: '#F8FAFC',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', color: '#555', marginBottom: 14 }}>
              ⊕ Réinitialiser le cadrage
            </button>

            {/* Changer de photo */}
            <button onClick={pickFile}
              style={{ width: '100%', padding: '9px', borderRadius: 9,
                border: '1.5px solid rgba(26,158,138,.3)', background: '#E8F7F4',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', color: '#1A9E8A', marginBottom: 14 }}>
              📁 Choisir une autre photo
            </button>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 9,
                padding: '9px 12px', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Actions principales */}
            <div style={{ display: 'flex', gap: 10 }}>
              {photoUrl && (
                <button onClick={handleDelete}
                  style={{ flex: 1, padding: '12px', borderRadius: 12,
                    border: '1.5px solid rgba(239,68,68,.25)', background: '#FEF2F2',
                    color: '#EF4444', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑 Supprimer
                </button>
              )}
              <button onClick={handleSave} disabled={uploading}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                  background: uploading ? '#94A3B8' : 'linear-gradient(135deg,#1A9E8A,#22C6AD)',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                }}>
                {uploading ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)',
                    borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                    animation: 'spin .7s linear infinite' }}/> Enregistrement…</>
                ) : '✅ Enregistrer'}
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
