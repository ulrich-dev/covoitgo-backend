const jwt = require('jsonwebtoken')
const { queryOne } = require('../db')

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev_secret_changez_en_prod'
const JWT_EXPIRES = '3h'

// ── Générer un token JWT ──────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    {
      userId:    user.id,
      userEmail: user.email,
      userRole:  user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

// ── Vérifier le token (depuis Authorization header ou cookie) ─
function requireAuth(req, res, next) {
  // 1. Chercher dans le header Authorization: Bearer <token>
  const authHeader = req.headers['authorization']
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // 2. Fallback : chercher dans le cookie (compatibilité)
  const tokenFromCookie = req.cookies?.cvg_token || null

  // 3. Fallback : session classique (pour OAuth pendant la transition)
  const tokenFromSession = req.session?.userId ? 'session' : null

  const token = tokenFromHeader || tokenFromCookie

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.session = req.session || {}
      req.session.userId    = decoded.userId
      req.session.userEmail = decoded.userEmail
      req.session.userRole  = decoded.userRole
      return next()
    } catch (err) {
      // Token expiré ou invalide
      return res.status(401).json({ success: false, message: 'Session expirée. Reconnectez-vous.' })
    }
  }

  // Fallback session
  if (req.session?.userId) {
    return next()
  }

  return res.status(401).json({ success: false, message: 'Non autorisé. Veuillez vous connecter.' })
}

// ── Vérifier conducteur ───────────────────────────────────────
function requireDriver(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' })
  }
  if (!['driver', 'both'].includes(req.session.userRole)) {
    return res.status(403).json({ success: false, message: 'Accès réservé aux conducteurs.' })
  }
  next()
}

// ── Vérifier admin ────────────────────────────────────────────
async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' })
  }
  try {
    const user = await queryOne('SELECT is_admin FROM users WHERE id = $1', [req.session.userId])
    if (!user?.is_admin) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' })
    }
    next()
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
}

module.exports = { requireAuth, requireDriver, requireAdmin, generateToken }
