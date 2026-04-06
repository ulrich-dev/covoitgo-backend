const express = require('express')
const { body, validationResult } = require('express-validator')
const { query, queryOne } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

// ══════════════════════════════════════════════
//  ALERTES TRAJETS
// ══════════════════════════════════════════════

// GET /api/alerts — liste mes alertes
router.get('/', async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM trip_alerts WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.session.userId]
    )
    res.json({ success: true, alerts: rows.rows })
  } catch (err) {
    console.error('GET /alerts:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// POST /api/alerts — créer une alerte
router.post('/',
  [
    body('originCity').trim().notEmpty(),
    body('destinationCity').trim().notEmpty(),
    body('seatsNeeded').optional().isInt({ min: 1, max: 8 }),
    body('maxPrice').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides.' })

      const { originCity, destinationCity, dateFrom, dateTo, maxPrice, seatsNeeded = 1 } = req.body

      // Max 5 alertes actives par utilisateur
      const count = await queryOne(
        `SELECT COUNT(*) AS cnt FROM trip_alerts WHERE user_id=$1 AND is_active=true`,
        [req.session.userId]
      )
      if (parseInt(count.cnt) >= 5) {
        return res.status(400).json({ success: false, message: 'Maximum 5 alertes actives autorisées.' })
      }

      const alert = await queryOne(
        `INSERT INTO trip_alerts
           (user_id, origin_city, destination_city, date_from, date_to, max_price, seats_needed)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.session.userId, originCity, destinationCity, dateFrom||null, dateTo||null, maxPrice||null, seatsNeeded]
      )
      res.status(201).json({ success: true, alert })
    } catch (err) {
      console.error('POST /alerts:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// PATCH /api/alerts/:id — activer/désactiver
router.patch('/:id', async (req, res) => {
  try {
    const { isActive } = req.body
    const alert = await queryOne(
      `UPDATE trip_alerts SET is_active=$1, updated_at=NOW()
       WHERE id=$2 AND user_id=$3 RETURNING *`,
      [isActive, req.params.id, req.session.userId]
    )
    if (!alert) return res.status(404).json({ success: false, message: 'Alerte introuvable.' })
    res.json({ success: true, alert })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// DELETE /api/alerts/:id — supprimer une alerte
router.delete('/:id', async (req, res) => {
  try {
    await queryOne(
      `DELETE FROM trip_alerts WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.session.userId]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  FAVORIS
// ══════════════════════════════════════════════

// GET /api/alerts/favorites — mes favoris
router.get('/favorites', async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM trip_favorites WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.session.userId]
    )
    res.json({ success: true, favorites: rows.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// POST /api/alerts/favorites — ajouter un favori
router.post('/favorites',
  [
    body('originCity').trim().notEmpty(),
    body('destinationCity').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides.' })

      const { originCity, destinationCity, notify = true } = req.body

      const fav = await queryOne(
        `INSERT INTO trip_favorites (user_id, origin_city, destination_city, notify)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, origin_city, destination_city)
         DO UPDATE SET notify=$4, created_at=NOW()
         RETURNING *`,
        [req.session.userId, originCity, destinationCity, notify]
      )
      res.status(201).json({ success: true, favorite: fav })
    } catch (err) {
      console.error('POST /alerts/favorites:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// PATCH /api/alerts/favorites/:id — toggle notifications
router.patch('/favorites/:id', async (req, res) => {
  try {
    const { notify } = req.body
    const fav = await queryOne(
      `UPDATE trip_favorites SET notify=$1 WHERE id=$2 AND user_id=$3 RETURNING *`,
      [notify, req.params.id, req.session.userId]
    )
    if (!fav) return res.status(404).json({ success: false, message: 'Favori introuvable.' })
    res.json({ success: true, favorite: fav })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// DELETE /api/alerts/favorites/:id — supprimer un favori
router.delete('/favorites/:id', async (req, res) => {
  try {
    await queryOne(
      `DELETE FROM trip_favorites WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.session.userId]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  Fonction interne — déclenchée par le scheduler
//  quand un nouveau trajet est publié
// ══════════════════════════════════════════════
async function notifyMatchingAlerts(trip) {
  const { sendTripAlertEmail } = require('../utils/email')

  try {
    // Chercher les alertes qui correspondent
    const alerts = await query(
      `SELECT ta.*, u.email, u.first_name
       FROM trip_alerts ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.is_active = true
         AND ta.origin_city      ILIKE $1
         AND ta.destination_city ILIKE $2
         AND (ta.seats_needed IS NULL OR ta.seats_needed <= $3)
         AND (ta.max_price   IS NULL OR ta.max_price   >= $4)
         AND (ta.date_from   IS NULL OR ta.date_from   <= $5::date)
         AND (ta.date_to     IS NULL OR ta.date_to     >= $5::date)
         AND ta.user_id != $6
         AND (ta.notified_at IS NULL OR ta.notified_at < NOW() - INTERVAL '2 hours')`,
      [trip.origin_city, trip.destination_city, trip.available_seats, trip.price_per_seat, trip.departure_at, trip.driver_id]
    )

    // Chercher aussi les favoris avec notifications activées
    const favorites = await query(
      `SELECT tf.*, u.email, u.first_name
       FROM trip_favorites tf
       JOIN users u ON u.id = tf.user_id
       WHERE tf.notify = true
         AND tf.origin_city      ILIKE $1
         AND tf.destination_city ILIKE $2
         AND tf.user_id != $3`,
      [trip.origin_city, trip.destination_city, trip.driver_id]
    )

    const notified = new Set()

    for (const alert of alerts.rows) {
      if (notified.has(alert.user_id)) continue
      notified.add(alert.user_id)

      await sendTripAlertEmail({
        userEmail:   alert.email,
        userName:    alert.first_name,
        from:        trip.origin_city,
        to:          trip.destination_city,
        departureAt: trip.departure_at,
        price:       trip.price_per_seat,
        seats:       trip.available_seats,
        tripId:      trip.id,
        type:        'alert',
      }).catch(() => {})

      await queryOne(
        `UPDATE trip_alerts SET notified_at=NOW() WHERE id=$1`,
        [alert.id]
      )
    }

    for (const fav of favorites.rows) {
      if (notified.has(fav.user_id)) continue
      notified.add(fav.user_id)

      await sendTripAlertEmail({
        userEmail:   fav.email,
        userName:    fav.first_name,
        from:        trip.origin_city,
        to:          trip.destination_city,
        departureAt: trip.departure_at,
        price:       trip.price_per_seat,
        seats:       trip.available_seats,
        tripId:      trip.id,
        type:        'favorite',
      }).catch(() => {})
    }
  } catch (err) {
    console.error('notifyMatchingAlerts:', err)
  }
}

module.exports = { router, notifyMatchingAlerts }
