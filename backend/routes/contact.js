const express = require('express')
const { body, validationResult } = require('express-validator')
const { query: dbQuery } = require('../db')
const { sendContactEmail, CONTACT_SUBJECTS } = require('../utils/email')

const router = express.Router()

// ── Rate limiting simple en mémoire (3 messages / heure / IP) ──
const rateLimitMap = new Map()
const MAX_PER_HOUR = 3

function checkRateLimit(ip) {
  const now  = Date.now()
  const hour = 60 * 60 * 1000
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => now - t < hour)
  if (timestamps.length >= MAX_PER_HOUR) return false
  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, ts] of rateLimitMap.entries()) {
    const fresh = ts.filter(t => now - t < 3600000)
    if (!fresh.length) rateLimitMap.delete(ip)
    else rateLimitMap.set(ip, fresh)
  }
}, 3600000)

// ══════════════════════════════════════════════
//  GET /api/contact/subjects
// ══════════════════════════════════════════════
router.get('/subjects', (req, res) => {
  res.json({
    success: true,
    subjects: Object.entries(CONTACT_SUBJECTS).map(([key, label]) => ({ key, label })),
  })
})

// ══════════════════════════════════════════════
//  POST /api/contact — Envoi message
//  Stratégie : DB d'abord → réponse succès → email en arrière-plan
// ══════════════════════════════════════════════
router.post('/',
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('category').isIn(Object.keys(CONTACT_SUBJECTS)),
    body('subject').trim().notEmpty().isLength({ min: 5, max: 150 }),
    body('message').trim().notEmpty().isLength({ min: 20, max: 2000 }),
  ],
  async (req, res) => {

    // ── Validation ─────────────────────────────────────────────
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      const msgs = {
        name:     'Nom requis.',
        email:    'Email invalide.',
        category: 'Catégorie invalide.',
        subject:  'Sujet requis (5 à 150 caractères).',
        message:  'Message requis (20 à 2000 caractères).',
      }
      const field = errors.array()[0].path
      return res.status(400).json({ success: false, message: msgs[field] || 'Données invalides.' })
    }

    // ── Rate limiting ──────────────────────────────────────────
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || (req.socket && req.socket.remoteAddress)
             || 'unknown'

    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: 'Trop de messages envoyés. Réessayez dans 1 heure.',
      })
    }

    const { name, email, category, subject, message } = req.body
    const userId = (req.session && req.session.userId) ? req.session.userId : null

    // ── 1. Sauvegarder en base de données ─────────────────────
    // Si la table n'existe pas encore, on continue quand même
    let savedId = null
    try {
      const result = await dbQuery(
        `INSERT INTO contact_messages
           (user_id, name, email, category, subject, message, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id`,
        [userId, name, email, category, subject, message, ip]
      )
      savedId = result.rows[0] && result.rows[0].id
    } catch (dbErr) {
      // La table n'existe peut-être pas encore → pas bloquant
      console.warn('[contact] DB non disponible:', dbErr.message)
    }

    // ── 2. Répondre succès immédiatement ──────────────────────
    // L'utilisateur ne sera jamais bloqué par un problème d'email
    res.json({
      success: true,
      message: 'Message envoyé ! Nous vous répondrons sous 24-48h.',
    })

    // ── 3. Email en arrière-plan (sans bloquer la réponse) ─────
    setImmediate(() => {
      sendContactEmail({ name, email, category, subject, message, userId })
        .then(() => {
          if (savedId) {
            dbQuery(
              `UPDATE contact_messages SET email_sent = true WHERE id = $1`,
              [savedId]
            ).catch(() => {})
          }
          console.log(`📧  Contact envoyé → ${email}`)
        })
        .catch((err) => {
          console.error(`[contact] Email échoué (message ${savedId || 'non sauvegardé'}):`, err.message)
        })
    })
  }
)

// ══════════════════════════════════════════════
//  Routes admin (gestion des messages reçus)
// ══════════════════════════════════════════════
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.get('/admin/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const conditions = status ? ['status = $1'] : []
    const params     = status ? [status] : []
    const where      = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const n          = params.length

    const [rows, total] = await Promise.all([
      dbQuery(
        `SELECT id, name, email, category, subject, message,
                status, email_sent, created_at
         FROM contact_messages
         ${where}
         ORDER BY created_at DESC
         LIMIT $${n+1} OFFSET $${n+2}`,
        [...params, parseInt(limit), offset]
      ),
      dbQuery(
        `SELECT COUNT(*) AS total FROM contact_messages ${where}`,
        params
      ),
    ])

    res.json({
      success:  true,
      messages: rows.rows,
      total:    parseInt(total.rows[0].total),
    })
  } catch (err) {
    console.error('GET /contact/admin/list:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

router.patch('/admin/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body
    if (!['new','in_progress','resolved'].includes(status))
      return res.status(400).json({ success: false, message: 'Statut invalide.' })

    await dbQuery(
      `UPDATE contact_messages
       SET status = $1,
           resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE NULL END
       WHERE id = $2`,
      [status, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false })
  }
})

module.exports = router

// ══════════════════════════════════════════════
//  GET /api/contact/admin/:id/thread
//  Fil de discussion complet d'un message
// ══════════════════════════════════════════════
router.get('/admin/:id/thread', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const [msg, replies] = await Promise.all([
      dbQuery(
        `SELECT cm.*, u.first_name, u.last_name
         FROM contact_messages cm
         LEFT JOIN users u ON u.id = cm.user_id
         WHERE cm.id = $1`,
        [id]
      ),
      dbQuery(
        `SELECT * FROM contact_replies WHERE contact_id = $1 ORDER BY created_at ASC`,
        [id]
      ),
    ])

    if (!msg.rows[0]) return res.status(404).json({ success: false, message: 'Message introuvable.' })

    res.json({
      success: true,
      message: msg.rows[0],
      replies: replies.rows,
    })
  } catch (err) {
    console.error('GET /contact/admin/:id/thread:', err)
    res.status(500).json({ success: false })
  }
})

// ══════════════════════════════════════════════
//  POST /api/contact/admin/:id/reply
//  L'admin répond à un message de contact
// ══════════════════════════════════════════════
const { sendAdminReplyEmail } = require('../utils/email')

router.post('/admin/:id/reply', requireAuth, requireAdmin,
  [body('body').trim().notEmpty().isLength({ min: 5, max: 3000 })],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Réponse invalide (5 à 3000 caractères).' })

    try {
      const { id } = req.params
      const { body: replyBody, markResolved = false } = req.body

      // Récupérer le message original
      const contact = await dbQuery(
        `SELECT * FROM contact_messages WHERE id = $1`, [id]
      )
      if (!contact.rows[0]) return res.status(404).json({ success: false, message: 'Message introuvable.' })
      const cm = contact.rows[0]

      // Récupérer l'admin
      const admin = await dbQuery(
        `SELECT first_name, last_name, email FROM users WHERE id = $1`, [req.session.userId]
      )
      const adminUser = admin.rows[0]
      const adminName = adminUser ? `${adminUser.first_name} ${adminUser.last_name}` : 'Support Covoitgo'

      // Sauvegarder la réponse
      const saved = await dbQuery(
        `INSERT INTO contact_replies (contact_id, author_type, author_name, author_email, body)
         VALUES ($1, 'admin', $2, $3, $4) RETURNING *`,
        [id, adminName, adminUser?.email || 'support@covoitgo.cm', replyBody]
      )

      // Mettre à jour le statut
      const newStatus = markResolved ? 'resolved' : 'in_progress'
      await dbQuery(
        `UPDATE contact_messages SET status = $1, resolved_at = $2 WHERE id = $3`,
        [newStatus, markResolved ? new Date() : null, id]
      )

      // Envoyer l'email au client en arrière-plan
      setImmediate(() => {
        sendAdminReplyEmail({
          clientEmail:     cm.email,
          clientName:      cm.name,
          adminName,
          subject:         cm.subject,
          replyBody,
          originalMessage: cm.message,
          contactId:       id,
        })
          .then(() => dbQuery(`UPDATE contact_replies SET email_sent = true WHERE id = $1`, [saved.rows[0].id]).catch(() => {}))
          .catch(err => console.error('[contact reply] Email échoué:', err.message))
      })

      res.json({
        success: true,
        reply:   saved.rows[0],
        status:  newStatus,
      })
    } catch (err) {
      console.error('POST /contact/admin/:id/reply:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  POST /api/contact/client-reply
//  Le client répond depuis son email (endpoint public)
//  Identifié par un token = l'id du contact
// ══════════════════════════════════════════════
const { sendClientReplyNotifEmail } = require('../utils/email')

router.post('/client-reply',
  [
    body('contactId').notEmpty().isUUID(),
    body('body').trim().notEmpty().isLength({ min: 5, max: 3000 }),
    body('email').isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides.' })

    try {
      const { contactId, body: replyBody, email } = req.body

      // Vérifier que l'email correspond bien à ce contact
      const contact = await dbQuery(
        `SELECT * FROM contact_messages WHERE id = $1 AND email = $2`,
        [contactId, email]
      )
      if (!contact.rows[0]) return res.status(403).json({ success: false, message: 'Accès refusé.' })
      const cm = contact.rows[0]

      // Sauvegarder la réponse client
      const saved = await dbQuery(
        `INSERT INTO contact_replies (contact_id, author_type, author_name, author_email, body)
         VALUES ($1, 'client', $2, $3, $4) RETURNING *`,
        [contactId, cm.name, cm.email, replyBody]
      )

      // Remettre en "in_progress" si résolu
      if (cm.status === 'resolved') {
        await dbQuery(`UPDATE contact_messages SET status = 'in_progress', resolved_at = NULL WHERE id = $1`, [contactId])
      }

      // Notifier l'admin
      setImmediate(() => {
        sendClientReplyNotifEmail({
          clientName:  cm.name,
          clientEmail: cm.email,
          subject:     cm.subject,
          replyBody,
          contactId,
        }).catch(err => console.error('[client reply notif] Email échoué:', err.message))
      })

      res.json({ success: true, reply: saved.rows[0] })
    } catch (err) {
      console.error('POST /contact/client-reply:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)
