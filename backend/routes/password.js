// ══════════════════════════════════════════════════════════════
//  Backend route — Changement de mot de passe
//  À AJOUTER dans backend/routes/auth.js
// ══════════════════════════════════════════════════════════════
//
// Copier ce bloc de code et l'ajouter dans backend/routes/auth.js
// AVANT la ligne `module.exports = router`
//
// Ou créer un fichier séparé et l'importer dans server.js

const express = require('express')
const bcrypt  = require('bcrypt')
const { query, queryOne } = require('../db')
const { requireAuth }     = require('../middleware/auth')

const router = express.Router()

// ── PATCH /api/auth/password — Changer le mot de passe ──────
router.patch('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.session.userId

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Mots de passe requis' })
    }

    // Validation du nouveau mot de passe
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' })
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins une majuscule' })
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins un chiffre' })
    }

    // Récupérer l'utilisateur
    const user = await queryOne(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [userId]
    )
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' })
    }

    // Vérifier l'ancien mot de passe
    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' })
    }

    // Hacher le nouveau
    const newHash = await bcrypt.hash(newPassword, 10)

    // Mettre à jour
    await query(
      `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2`,
      [newHash, userId]
    )

    res.json({ success: true, message: 'Mot de passe modifié avec succès' })
  } catch (err) {
    console.error('password change:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

module.exports = router
