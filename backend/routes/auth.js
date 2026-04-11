const express   = require('express')
const bcrypt    = require('bcryptjs')
const crypto    = require('crypto')
const { body, validationResult } = require('express-validator')
const { query, queryOne } = require('../db')
const { requireAuth }     = require('../middleware/auth')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email')

const router = express.Router()
const makeToken = () => crypto.randomBytes(48).toString('hex')

// ══════════════════════════════════════════════
//  POST /api/auth/register
// ══════════════════════════════════════════════
router.post('/register',
  [
    body('firstName').trim().notEmpty().withMessage('Le prénom est requis.'),
    body('lastName').trim().notEmpty().withMessage('Le nom est requis.'),
    body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('password')
      .isLength({ min: 8 }).withMessage('Minimum 8 caractères.')
      .matches(/[A-Z]/).withMessage('Doit contenir une majuscule.')
      .matches(/[0-9]/).withMessage('Doit contenir un chiffre.'),
    body('birthDate').optional().isDate().withMessage('Date invalide.'),
    body('role').optional().isIn(['passenger', 'driver', 'both']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg })

      const { firstName, lastName, email, password, birthDate, phone, role, bio } = req.body

      const existing = await queryOne('SELECT id, email_verified FROM users WHERE email = $1', [email])
      if (existing) {
        if (!existing.email_verified) {
          const token = makeToken()
          await query('UPDATE users SET verify_token=$1, verify_token_expires=$2 WHERE id=$3',
            [token, new Date(Date.now() + 24*3600*1000), existing.id])
          await sendVerificationEmail({ email, firstName, token }).catch(console.error)
          return res.status(409).json({ success:false, message:"Ce compte n'est pas encore vérifié. Un nouveau mail vient d'être envoyé.", needsVerification:true })
        }
        return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const colors = ['#1A9E8A','#FF6B35','#7C3AED','#0EA5E9','#F59E0B']
      const avatarColor = colors[Math.floor(Math.random() * colors.length)]
      const verifyToken   = makeToken()
      const verifyExpires = new Date(Date.now() + 24*3600*1000)
      const language      = req.body.language || 'en'  // langue choisie à l'inscription

      await queryOne(
        `INSERT INTO users (email,password_hash,first_name,last_name,birth_date,phone,role,bio,avatar_color,language,email_verified,verify_token,verify_token_expires)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12)`,
        [email,passwordHash,firstName,lastName,birthDate||null,phone||null,role||'both',bio||null,avatarColor,language,verifyToken,verifyExpires]
      )

      sendVerificationEmail({ email, firstName, token: verifyToken, lang: language }).catch(console.error)

      res.status(201).json({ success:true, message:'Compte créé ! Vérifiez votre email pour activer votre compte.', needsVerification:true, email })

    } catch (error) {
      console.error('register:', error)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  GET /api/auth/verify-email?token=xxx
// ══════════════════════════════════════════════
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ success:false, message:'Token manquant.' })

    const user = await queryOne(
      `SELECT id,email,first_name,last_name,role,avatar_color,avatar_url,avg_rating,review_count
       FROM users WHERE verify_token=$1 AND verify_token_expires>NOW() AND email_verified=false`,
      [token]
    )

    if (!user) return res.status(400).json({ success:false, message:'Lien invalide ou expiré.', expired:true })

    await query('UPDATE users SET email_verified=true,verify_token=NULL,verify_token_expires=NULL WHERE id=$1', [user.id])

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ success:false, message:'Erreur session.' })
      req.session.userId    = user.id
      req.session.userEmail = user.email
      req.session.userRole  = user.role
      req.session.save(() => res.json({
        success:true, message:'Email vérifié ! Bienvenue 🎉',
        user: { id:user.id, email:user.email, firstName:user.first_name, lastName:user.last_name,
          name:`${user.first_name} ${user.last_name}`, avatar:user.first_name[0].toUpperCase(),
          avatarUrl:user.avatar_url||null,
          avatarColor:user.avatar_color, role:user.role, rating:parseFloat(user.avg_rating)||0, reviewCount:user.review_count }
      }))
    })
  } catch (error) {
    console.error('verify-email:', error)
    res.status(500).json({ success:false, message:'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/auth/resend-verification
// ══════════════════════════════════════════════
router.post('/resend-verification', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  try {
    const { email } = req.body
    const user = await queryOne('SELECT id,first_name,email_verified FROM users WHERE email=$1', [email])
    if (!user || user.email_verified) return res.json({ success:true, message:'Si ce compte existe et n\'est pas vérifié, un email a été envoyé.' })

    const token = makeToken()
    await query('UPDATE users SET verify_token=$1,verify_token_expires=$2 WHERE id=$3',
      [token, new Date(Date.now()+24*3600*1000), user.id])
    await sendVerificationEmail({ email, firstName:user.first_name, token }).catch(console.error)
    res.json({ success:true, message:'Email renvoyé.' })
  } catch (error) {
    res.status(500).json({ success:false, message:'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/auth/login
// ══════════════════════════════════════════════
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide.'),
    body('password').notEmpty().withMessage('Mot de passe requis.'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success:false, message:errors.array()[0].msg })

      const { email, password } = req.body
      const user = await queryOne(
        `SELECT id,email,password_hash,first_name,last_name,role,avatar_color,avatar_url,language,avg_rating,review_count,is_active,email_verified
         FROM users WHERE email=$1`,
        [email]
      )

      if (!user) return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect.' })
      if (!user.is_active) return res.status(403).json({ success:false, message:'Compte désactivé.', blocked:true, email:user.email })

      const ok = await bcrypt.compare(password, user.password_hash)
      if (!ok) return res.status(401).json({ success:false, message:'Email ou mot de passe incorrect.' })

      // Bloque si email non vérifié
      if (!user.email_verified) {
        return res.status(403).json({ success:false, message:'Veuillez vérifier votre email avant de vous connecter.', needsVerification:true, email:user.email })
      }

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ success:false, message:'Erreur session.' })
        req.session.userId    = user.id
        req.session.userEmail = user.email
        req.session.userRole  = user.role
        req.session.save(() => {
          // Enregistrer la connexion (non bloquant)
          query(
            `INSERT INTO connection_logs (user_id, ip_address, user_agent, method)
             VALUES ($1, $2, $3, 'email')`,
            [user.id,
             req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
             req.headers['user-agent'] || '']
          ).catch(() => {})

          res.json({
            success:true, message:'Connexion réussie !',
            user: { id:user.id, email:user.email, firstName:user.first_name, lastName:user.last_name,
              name:`${user.first_name} ${user.last_name}`, avatar:user.first_name[0].toUpperCase(),
              avatarUrl:user.avatar_url||null,
              avatarColor:user.avatar_color, role:user.role,
              language: user.language || 'en',
              rating:parseFloat(user.avg_rating)||0, reviewCount:user.review_count }
          })
        })
      })
    } catch (error) {
      console.error('login:', error)
      res.status(500).json({ success:false, message:'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  POST /api/auth/logout
// ══════════════════════════════════════════════
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('cvg.sid')
    res.json({ success:true })
  })
})

// ══════════════════════════════════════════════
//  POST /api/auth/oauth-session
//  Valider une session OAuth cross-domain (Vercel ↔ Railway)
//  Le frontend envoie le sid reçu dans l'URL après OAuth
// ══════════════════════════════════════════════
router.post('/oauth-session', async (req, res) => {
  try {
    const { sid } = req.body
    if (!sid) return res.status(400).json({ success: false, message: 'sid manquant.' })

    // Charger la session depuis la base
    const sessionRow = await queryOne(
      `SELECT sess FROM session WHERE sid = $1 AND expire > NOW()`,
      [sid]
    )
    if (!sessionRow) return res.status(401).json({ success: false, message: 'Session expirée ou invalide.' })

    const sessionData = sessionRow.sess
    const userId = sessionData.userId

    if (!userId) return res.status(401).json({ success: false, message: 'Session invalide.' })

    // Créer une nouvelle session pour ce navigateur
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ success: false, message: 'Erreur session.' })
      req.session.userId    = userId
      req.session.userEmail = sessionData.userEmail
      req.session.userRole  = sessionData.userRole
      req.session.save(async () => {
        const user = await queryOne(
          `SELECT id,email,first_name,last_name,phone,role,bio,avatar_color,avatar_url,language,avg_rating,review_count,created_at,email_verified,is_admin
           FROM users WHERE id=$1 AND is_active=true`,
          [userId]
        )
        if (!user) return res.status(401).json({ success: false, message: 'Utilisateur introuvable.' })

        res.json({ success: true, user: {
          id: user.id, email: user.email,
          firstName: user.first_name, lastName: user.last_name,
          name: `${user.first_name} ${user.last_name}`,
          phone: user.phone,
          avatar: user.first_name[0].toUpperCase(),
          avatarColor: user.avatar_color,
          avatarUrl: user.avatar_url || null,
          language: user.language || 'en',
          role: user.role, bio: user.bio,
          rating: parseFloat(user.avg_rating) || 0,
          reviewCount: user.review_count,
          emailVerified: user.email_verified,
          memberSince: user.created_at,
          is_admin: user.is_admin || false,
        }})
      })
    })
  } catch (error) {
    console.error('oauth-session:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/auth/me
// ══════════════════════════════════════════════
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id,email,first_name,last_name,phone,role,bio,avatar_color,avatar_url,language,avg_rating,review_count,created_at,email_verified,is_admin
       FROM users WHERE id=$1 AND is_active=true`,
      [req.session.userId]
    )
    if (!user) { req.session.destroy(()=>{}); return res.status(401).json({ success:false, message:'Session expirée.' }) }

    res.json({ success:true, user: {
      id:user.id, email:user.email, firstName:user.first_name, lastName:user.last_name,
      name:`${user.first_name} ${user.last_name}`, phone:user.phone,
      avatar:user.first_name[0].toUpperCase(), avatarColor:user.avatar_color,
      avatarUrl:user.avatar_url||null,
      language: user.language || 'en',
      role:user.role, bio:user.bio,
      rating:parseFloat(user.avg_rating)||0, reviewCount:user.review_count,
      emailVerified:user.email_verified, memberSince:user.created_at,
      is_admin: user.is_admin || false,
    }})
  } catch (error) {
    res.status(500).json({ success:false, message:'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/auth/forgot-password
// ══════════════════════════════════════════════
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  try {
    const { email } = req.body
    const user = await queryOne('SELECT id,first_name,email_verified FROM users WHERE email=$1 AND is_active=true', [email])

    if (!user || !user.email_verified) {
      return res.json({ success:true, message:'Si ce compte existe, un email de réinitialisation a été envoyé.' })
    }

    const token   = makeToken()
    const expires = new Date(Date.now() + 3600*1000) // 1h
    await query('UPDATE users SET reset_token=$1,reset_token_expires=$2 WHERE id=$3', [token, expires, user.id])
    await sendPasswordResetEmail({ email, firstName:user.first_name, token }).catch(console.error)

    res.json({ success:true, message:'Email de réinitialisation envoyé. Vérifiez votre boîte mail.' })
  } catch (error) {
    console.error('forgot-password:', error)
    res.status(500).json({ success:false, message:'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/auth/check-reset-token?token=xxx
// ══════════════════════════════════════════════
router.get('/check-reset-token', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.json({ valid:false })
    const user = await queryOne('SELECT id,first_name FROM users WHERE reset_token=$1 AND reset_token_expires>NOW()', [token])
    res.json({ valid:!!user, firstName:user?.first_name })
  } catch (error) {
    res.json({ valid:false })
  }
})

// ══════════════════════════════════════════════
//  POST /api/auth/reset-password
// ══════════════════════════════════════════════
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password')
      .isLength({ min:8 }).withMessage('Minimum 8 caractères.')
      .matches(/[A-Z]/).withMessage('Doit contenir une majuscule.')
      .matches(/[0-9]/).withMessage('Doit contenir un chiffre.'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success:false, message:errors.array()[0].msg })

      const { token, password } = req.body
      const user = await queryOne(
        'SELECT id,email,first_name FROM users WHERE reset_token=$1 AND reset_token_expires>NOW() AND is_active=true',
        [token]
      )
      if (!user) return res.status(400).json({ success:false, message:'Lien invalide ou expiré.', expired:true })

      const passwordHash = await bcrypt.hash(password, 10)
      await query('UPDATE users SET password_hash=$1,reset_token=NULL,reset_token_expires=NULL WHERE id=$2', [passwordHash, user.id])

      // Invalide toutes les sessions existantes
      await query(`DELETE FROM session WHERE sess::text LIKE $1`, [`%${user.id}%`]).catch(()=>{})

      res.json({ success:true, message:'Mot de passe mis à jour ! Vous pouvez vous connecter.' })
    } catch (error) {
      console.error('reset-password:', error)
      res.status(500).json({ success:false, message:'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  PATCH /api/auth/profile — Modifier son profil
// ══════════════════════════════════════════════
router.patch('/profile', requireAuth,
  [
    body('firstName').optional().trim().notEmpty().isLength({ max: 100 }),
    body('lastName').optional().trim().notEmpty().isLength({ max: 100 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('bio').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg })

      const { firstName, lastName, phone, bio, language } = req.body
      const userId = req.session.userId

      const sets   = ['updated_at = NOW()']
      const params = []
      let n = 1

      if (firstName !== undefined) { sets.push(`first_name = $${n}`); params.push(firstName); n++ }
      if (lastName  !== undefined) { sets.push(`last_name  = $${n}`); params.push(lastName);  n++ }
      if (phone     !== undefined) { sets.push(`phone      = $${n}`); params.push(phone);     n++ }
      if (bio       !== undefined) { sets.push(`bio        = $${n}`); params.push(bio);       n++ }
      if (language  !== undefined) { sets.push(`language   = $${n}`); params.push(language);  n++ }

      params.push(userId)
      const user = await queryOne(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${n}
         RETURNING id, email, first_name, last_name, phone, bio, role`,
        params
      )

      res.json({ success: true, user })
    } catch (err) {
      console.error('PATCH /auth/profile:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  POST /api/auth/avatar — Upload photo de profil
// ══════════════════════════════════════════════
const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars')
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true })

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `avatar_${req.session.userId}_${Date.now()}${ext}`)
  },
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits:  { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif']
    if (!allowed.includes(file.mimetype))
      return cb(new Error('Format invalide. Utilisez JPG, PNG ou WEBP.'), false)
    cb(null, true)
  },
})

router.post('/avatar', requireAuth, (req, res) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Erreur lors de l\'upload.',
      })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' })
    }

    try {
      const userId   = req.session.userId
      const avatarUrl = `/uploads/avatars/${req.file.filename}`

      // Supprimer l'ancienne photo si elle existe (sauf si URL externe OAuth)
      const old = await queryOne(`SELECT avatar_url FROM users WHERE id = $1`, [userId])
      if (old?.avatar_url && old.avatar_url.startsWith('/uploads/avatars/')) {
        const oldPath = path.join(__dirname, '..', old.avatar_url)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }

      await queryOne(
        `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
        [avatarUrl, userId]
      )

      res.json({ success: true, avatarUrl })
    } catch (err) {
      console.error('POST /auth/avatar:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  })
})

// ── Servir les avatars ──────────────────────────────────────────
router.get('/avatar/:filename', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', 'avatars', req.params.filename)
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Non trouvé.' })
  res.sendFile(filePath)
})

// ══════════════════════════════════════════════
//  DELETE /api/auth/avatar — Supprimer la photo
// ══════════════════════════════════════════════
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId
    const user   = await queryOne(`SELECT avatar_url FROM users WHERE id = $1`, [userId])

    if (user?.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
      const filePath = path.join(__dirname, '..', user.avatar_url)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    await queryOne(`UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = $1`, [userId])
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /auth/avatar:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

module.exports = router

// ══════════════════════════════════════════════
//  OAUTH — Google
// ══════════════════════════════════════════════
const passport = require('passport')
require('../config/passport') // charge les stratégies

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// Formatte un user DB en objet session frontend
const formatUser = (u) => ({
  id:          u.id,
  email:       u.email,
  firstName:   u.first_name,
  lastName:    u.last_name,
  name:        `${u.first_name} ${u.last_name}`.trim(),
  avatar:      u.first_name?.[0]?.toUpperCase() || 'U',
  avatarColor: u.avatar_color,
  avatarUrl:   u.avatar_url,
  role:        u.role,
  rating:      parseFloat(u.avg_rating) || 0,
  reviewCount: u.review_count,
})

// Démarre le flow Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

// Callback Google
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=google` }),
  (req, res) => {
    const user = req.user
    req.session.regenerate((err) => {
      if (err) return res.redirect(`${CLIENT_URL}/login?error=session`)
      req.session.userId    = user.id
      req.session.userEmail = user.email
      req.session.userRole  = user.role
      req.session.save((saveErr) => {
        if (saveErr) return res.redirect(`${CLIENT_URL}/login?error=session`)
        query(`INSERT INTO connection_logs (user_id, method) VALUES ($1, 'google')`, [user.id]).catch(()=>{})
        // Passer le sessionId dans l'URL pour que le frontend puisse s'authentifier cross-domain
        const sid = req.session.id
        res.redirect(`${CLIENT_URL}/?oauth=success&sid=${sid}`)
      })
    })
  }
)

// ══════════════════════════════════════════════
//  OAUTH — Facebook
// ══════════════════════════════════════════════

// Démarre le flow Facebook
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
)

// Callback Facebook
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${CLIENT_URL}/login?error=facebook` }),
  (req, res) => {
    const user = req.user
    req.session.regenerate((err) => {
      if (err) return res.redirect(`${CLIENT_URL}/login?error=session`)
      req.session.userId    = user.id
      req.session.userEmail = user.email
      req.session.userRole  = user.role
      req.session.save((saveErr) => {
        if (saveErr) return res.redirect(`${CLIENT_URL}/login?error=session`)
        query(`INSERT INTO connection_logs (user_id, method) VALUES ($1, 'facebook')`, [user.id]).catch(()=>{})
        const sid = req.session.id
        res.redirect(`${CLIENT_URL}/?oauth=success&sid=${sid}`)
      })
    })
  }
)

