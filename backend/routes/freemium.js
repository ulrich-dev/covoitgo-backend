const express = require('express')
const { body, validationResult } = require('express-validator')
const { query, queryOne } = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

// Nombre de trajets gratuits offerts
const FREE_TRIPS = 10
// Commission en % (10%)
const COMMISSION_RATE = 0.10

// ══════════════════════════════════════════════
//  GET /api/freemium/status
//  Statut freemium du conducteur connecté
// ══════════════════════════════════════════════
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT trips_published, free_trips_left, balance_due, payment_blocked, last_payment_at
       FROM users WHERE id = $1`,
      [req.session.userId]
    )
    if (!user) return res.status(404).json({ success: false })

    const tripsDone     = parseInt(user.trips_published) || 0
    const freeLeft      = Math.max(0, parseInt(user.free_trips_left) || 0)
    const balanceDue    = parseFloat(user.balance_due) || 0
    const isBlocked     = user.payment_blocked && balanceDue > 0
    const canPublish    = !isBlocked

    res.json({
      success: true,
      freemium: {
        tripsDone,
        freeLeft,
        freeTotalOffered: FREE_TRIPS,
        balanceDue,
        isBlocked,
        canPublish,
        lastPaymentAt: user.last_payment_at,
        commissionRate: COMMISSION_RATE * 100, // en %
      },
    })
  } catch (err) {
    console.error('GET /freemium/status:', err)
    res.status(500).json({ success: false })
  }
})

// ══════════════════════════════════════════════
//  POST /api/freemium/payment-request
//  Le conducteur déclare avoir payé
// ══════════════════════════════════════════════
router.post('/payment-request', requireAuth,
  [
    body('method').isIn(['mtn_momo', 'orange_money', 'bank', 'cash']),
    body('phone').optional().trim(),
    body('reference').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides.' })

      const userId = req.session.userId
      const user = await queryOne(
        `SELECT balance_due, payment_blocked FROM users WHERE id = $1`, [userId]
      )
      if (!user) return res.status(404).json({ success: false })
      if (parseFloat(user.balance_due) <= 0) {
        return res.status(400).json({ success: false, message: 'Aucun montant dû.' })
      }

      // Vérifier pas de demande en attente
      const existing = await queryOne(
        `SELECT id FROM payment_requests WHERE user_id = $1 AND status = 'pending'`, [userId]
      )
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Une demande de paiement est déjà en cours. Notre équipe la vérifie sous 24h.',
        })
      }

      const { method, phone, reference } = req.body
      const amount = parseFloat(user.balance_due)

      const saved = await queryOne(
        `INSERT INTO payment_requests (user_id, amount, method, phone, reference)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, amount, method, phone || null, reference || null]
      )

      res.json({
        success: true,
        message: 'Demande de paiement envoyée. Notre équipe vérifie votre paiement sous 24h.',
        request: saved,
      })
    } catch (err) {
      console.error('POST /freemium/payment-request:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  GET /api/freemium/admin/debtors
//  Admin : liste des conducteurs qui doivent de l'argent
// ══════════════════════════════════════════════
router.get('/admin/debtors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query  // 'blocked' | 'pending' | all

    let where = 'WHERE u.balance_due > 0'
    if (status === 'blocked') where += ' AND u.payment_blocked = true'

    const debtors = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name,
        u.phone, u.avatar_color,
        u.trips_published, u.free_trips_left,
        u.balance_due, u.payment_blocked,
        u.last_payment_at, u.created_at,
        -- Dernière demande de paiement
        pr.id          AS req_id,
        pr.method      AS req_method,
        pr.phone       AS req_phone,
        pr.reference   AS req_ref,
        pr.status      AS req_status,
        pr.created_at  AS req_created_at
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM payment_requests WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
      ) pr ON true
      ${where}
      ORDER BY u.payment_blocked DESC, u.balance_due DESC
    `)

    const total_due = await queryOne(
      `SELECT COALESCE(SUM(balance_due), 0) AS total FROM users WHERE balance_due > 0`
    )

    res.json({
      success:   true,
      debtors:   debtors.rows,
      totalDue:  parseFloat(total_due.total),
      count:     debtors.rows.length,
    })
  } catch (err) {
    console.error('GET /freemium/admin/debtors:', err)
    res.status(500).json({ success: false })
  }
})

// ══════════════════════════════════════════════
//  GET /api/freemium/admin/payment-requests
//  Admin : liste des demandes de paiement
// ══════════════════════════════════════════════
router.get('/admin/payment-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query
    const where = status !== 'all' ? `WHERE pr.status = '${status}'` : ''

    const rows = await query(`
      SELECT
        pr.*,
        u.email, u.first_name, u.last_name, u.phone AS user_phone,
        u.balance_due, u.avatar_color
      FROM payment_requests pr
      JOIN users u ON u.id = pr.user_id
      ${where}
      ORDER BY pr.created_at DESC
      LIMIT 100
    `)

    res.json({ success: true, requests: rows.rows })
  } catch (err) {
    console.error('GET /freemium/admin/payment-requests:', err)
    res.status(500).json({ success: false })
  }
})

// ══════════════════════════════════════════════
//  PATCH /api/freemium/admin/payment-requests/:id
//  Admin : confirmer ou rejeter un paiement
// ══════════════════════════════════════════════
router.patch('/admin/payment-requests/:id', requireAuth, requireAdmin,
  [body('status').isIn(['confirmed', 'rejected']),
   body('note').optional().trim()],
  async (req, res) => {
    try {
      const { id } = req.params
      const { status, note } = req.body

      const pr = await queryOne(`SELECT * FROM payment_requests WHERE id = $1`, [id])
      if (!pr) return res.status(404).json({ success: false, message: 'Demande introuvable.' })
      if (pr.status !== 'pending') return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée.' })

      // Mettre à jour la demande
      await query(
        `UPDATE payment_requests SET status = $1, note = $2, updated_at = NOW() WHERE id = $3`,
        [status, note || null, id]
      )

      if (status === 'confirmed') {
        // Débloquer le compte et réinitialiser la dette
        await query(
          `UPDATE users
           SET balance_due = 0, payment_blocked = false, last_payment_at = NOW()
           WHERE id = $1`,
          [pr.user_id]
        )
      }

      res.json({ success: true, status })
    } catch (err) {
      console.error('PATCH /freemium/admin/payment-requests/:id:', err)
      res.status(500).json({ success: false })
    }
  }
)

// ══════════════════════════════════════════════
//  PATCH /api/freemium/admin/unblock/:userId
//  Admin : débloquer manuellement un utilisateur
// ══════════════════════════════════════════════
router.patch('/admin/unblock/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query(
      `UPDATE users SET payment_blocked = false, balance_due = 0, last_payment_at = NOW()
       WHERE id = $1`,
      [req.params.userId]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false })
  }
})

// ══════════════════════════════════════════════
//  GET /api/freemium/admin/report
//  Admin : rapport financier global
// ══════════════════════════════════════════════
router.get('/admin/report', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [summary, monthly, topDebtor] = await Promise.all([
      queryOne(`
        SELECT
          COUNT(*) FILTER (WHERE balance_due > 0)          AS debtors_count,
          COALESCE(SUM(balance_due) FILTER (WHERE balance_due > 0), 0) AS total_due,
          COUNT(*) FILTER (WHERE payment_blocked = true)   AS blocked_count,
          COUNT(*) FILTER (WHERE free_trips_left = 0)      AS paid_zone_count,
          COALESCE(AVG(trips_published), 0)                AS avg_trips
        FROM users WHERE role IN ('driver', 'both')
      `),
      query(`
        SELECT
          DATE_TRUNC('month', created_at) AS month,
          COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
          COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) AS amount_confirmed
        FROM payment_requests
        GROUP BY month ORDER BY month DESC LIMIT 12
      `),
      queryOne(`
        SELECT id, first_name, last_name, email, balance_due
        FROM users WHERE balance_due > 0 ORDER BY balance_due DESC LIMIT 1
      `),
    ])

    res.json({
      success: true,
      report: {
        summary,
        monthly:    monthly.rows,
        topDebtor,
        commissionRate: COMMISSION_RATE * 100,
        freeTrips:      FREE_TRIPS,
      },
    })
  } catch (err) {
    console.error('GET /freemium/admin/report:', err)
    res.status(500).json({ success: false })
  }
})

module.exports = router
module.exports.FREE_TRIPS       = FREE_TRIPS
module.exports.COMMISSION_RATE  = COMMISSION_RATE
