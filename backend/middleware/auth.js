/**
 * Middleware d'authentification
 * Vérifie qu'une session valide existe avant d'accéder à une route protégée
 */

// Vérifie que l'utilisateur est connecté
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: 'Non autorisé. Veuillez vous connecter.'
    })
  }
  next()
}

// Vérifie que l'utilisateur est conducteur
const requireDriver = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' })
  }
  if (!['driver', 'both'].includes(req.session.userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux conducteurs.'
    })
  }
  next()
}

// Vérifie que l'utilisateur est administrateur
const requireAdmin = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' })
  }
  try {
    const { queryOne } = require('../db')
    const user = await queryOne('SELECT is_admin FROM users WHERE id = $1', [req.session.userId])
    if (!user?.is_admin) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' })
    }
    next()
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
}

module.exports = { requireAuth, requireDriver, requireAdmin }
