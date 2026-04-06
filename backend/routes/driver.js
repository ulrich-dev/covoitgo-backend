const express  = require('express')
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { queryOne, query } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── Dossier uploads ───────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'documents')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// ── Config Multer ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext   = path.extname(file.originalname).toLowerCase()
    const name  = `${req.session.userId}_${file.fieldname}_${Date.now()}${ext}`
    cb(null, name)
  },
})

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase()
  const mime = file.mimetype

  const allowedExts  = ['.jpg', '.jpeg', '.png', '.pdf', '.heic', '.webp']
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']

  if (!allowedExts.includes(ext) || !allowedMimes.includes(mime)) {
    return cb(new Error('FORMAT_INVALID'), false)
  }
  cb(null, true)
}

// Limites selon les normes web :
//  • Images (JPG/PNG/WEBP) : 5 Mo max  — suffisant pour une photo de document nette
//  • PDF                  : 10 Mo max  — certains PDF de documents officiels sont lourds
//  • Taille maximale globale par fichier : 10 Mo (Multer bloque avant le filtre MIME)
const MAX_SIZE_IMAGE = 5  * 1024 * 1024   // 5 Mo
const MAX_SIZE_PDF   = 10 * 1024 * 1024   // 10 Mo
const MAX_SIZE_TOTAL = 10 * 1024 * 1024   // 10 Mo (garde-fou global Multer)

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_TOTAL, files: 2 },
})

// ══════════════════════════════════════════════
//  GET /api/driver/profile
//  Infos véhicule + statut documents de l'utilisateur connecté
// ══════════════════════════════════════════════
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT car_brand, car_model, car_color, car_year, car_plate,
              license_doc, identity_doc, docs_status
       FROM users WHERE id = $1`,
      [req.session.userId]
    )
    res.json({ success: true, profile: user || {} })
  } catch (err) {
    console.error('GET /driver/profile:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  PATCH /api/driver/vehicle
//  Enregistre les infos du véhicule
// ══════════════════════════════════════════════
router.patch('/vehicle', requireAuth, async (req, res) => {
  try {
    const { carBrand, carModel, carColor, carYear, carPlate } = req.body

    if (!carBrand || !carModel || !carColor) {
      return res.status(400).json({ success: false, message: 'Marque, modèle et couleur sont requis.' })
    }

    const user = await queryOne(
      `UPDATE users
       SET car_brand = $1, car_model = $2, car_color = $3,
           car_year  = $4, car_plate = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING car_brand, car_model, car_color, car_year, car_plate`,
      [carBrand, carModel, carColor, carYear || null, carPlate || null, req.session.userId]
    )

    res.json({ success: true, vehicle: user })
  } catch (err) {
    console.error('PATCH /driver/vehicle:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/driver/documents
//  Upload permis de conduire + pièce d'identité
// ══════════════════════════════════════════════
router.post(
  '/documents',
  requireAuth,
  (req, res, next) => {
    upload.fields([
      { name: 'license_doc',  maxCount: 1 },
      { name: 'identity_doc', maxCount: 1 },
    ])(req, res, (err) => {
      if (err) {
        // Erreur Multer (taille dépassée, etc.)
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'Fichier trop volumineux. Maximum 10 Mo par document.' })
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ success: false, message: 'Trop de fichiers envoyés.' })
        }
        if (err.message === 'FORMAT_INVALID') {
          return res.status(400).json({ success: false, message: 'Format non accepté. Utilisez JPG, PNG, WEBP ou PDF.' })
        }
        return res.status(400).json({ success: false, message: err.message || 'Erreur upload.' })
      }
      next()
    })
  },
  async (req, res) => {
    try {
      const files = req.files || {}

      // Vérification taille selon le type MIME
      for (const field of ['license_doc', 'identity_doc']) {
        const f = files[field]?.[0]
        if (!f) continue
        const isPdf   = f.mimetype === 'application/pdf'
        const maxSize = isPdf ? MAX_SIZE_PDF : MAX_SIZE_IMAGE
        if (f.size > maxSize) {
          // Supprimer le fichier déjà sauvegardé
          fs.unlink(f.path, () => {})
          const maxLabel = isPdf ? '10 Mo' : '5 Mo'
          return res.status(400).json({
            success: false,
            message: `Le fichier "${f.originalname}" dépasse la limite autorisée (${maxLabel} pour ${isPdf ? 'PDF' : 'images'}).`,
          })
        }
      }

      const sets   = ['docs_status = $1', 'updated_at = NOW()']
      const params = ['pending']
      let n = 2

      if (files.license_doc?.[0]) {
        sets.push(`license_doc = $${n}`)
        params.push(files.license_doc[0].filename)
        n++
      }
      if (files.identity_doc?.[0]) {
        sets.push(`identity_doc = $${n}`)
        params.push(files.identity_doc[0].filename)
        n++
      }

      if (sets.length === 2) {
        return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' })
      }

      params.push(req.session.userId)
      await query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${n}`,
        params
      )

      res.json({
        success: true,
        message: 'Documents envoyés. Ils seront vérifiés par notre équipe sous 24h.',
        hasLicense:  !!files.license_doc?.[0],
        hasIdentity: !!files.identity_doc?.[0],
      })
    } catch (err) {
      console.error('POST /driver/documents:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  GET /api/driver/documents/:filename
//  Servir un fichier document (admin ou propriétaire)
// ══════════════════════════════════════════════
router.get('/documents/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params
    const userId = req.session.userId

    // Vérifier que le fichier appartient à l'utilisateur ou est admin
    const user = await queryOne(
      `SELECT license_doc, identity_doc, is_admin FROM users WHERE id = $1`,
      [userId]
    )

    const isOwner = user?.license_doc === filename || user?.identity_doc === filename
    if (!isOwner && !user?.is_admin) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' })
    }

    const filePath = path.join(UPLOAD_DIR, filename)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier introuvable.' })
    }

    res.sendFile(filePath)
  } catch (err) {
    console.error('GET /driver/documents/:filename:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/driver/check
//  Vérifie si le conducteur a rempli les infos requises
//  Utilisé avant la publication d'un trajet
// ══════════════════════════════════════════════
router.get('/check', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT car_brand, car_model, car_color,
              license_doc, identity_doc, docs_status
       FROM users WHERE id = $1`,
      [req.session.userId]
    )

    const hasVehicle   = !!(user?.car_brand && user?.car_model && user?.car_color)
    const hasDocuments = !!(user?.license_doc && user?.identity_doc)
    const docsVerified = user?.docs_status === 'verified'
    const docsPending  = user?.docs_status === 'pending'

    res.json({
      success: true,
      hasVehicle,
      hasDocuments,
      docsVerified,
      docsPending,
      docsStatus: user?.docs_status || 'none',
      // Peut publier si véhicule renseigné + docs envoyés (vérifiés ou en attente)
      canPublish: hasVehicle && hasDocuments,
    })
  } catch (err) {
    console.error('GET /driver/check:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

module.exports = router
