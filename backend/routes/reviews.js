const express = require('express')
const { body, validationResult } = require('express-validator')
const { query, queryOne } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ══════════════════════════════════════════════
//  POST /api/reviews — Poster un avis
// ══════════════════════════════════════════════
router.post('/', requireAuth,
  [
    body('bookingId').notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Données invalides.' })

      const reviewerId = req.session.userId
      const { bookingId, rating, comment = '' } = req.body

      // Vérifier que le passager a bien effectué ce trajet
      const booking = await queryOne(`
        SELECT b.passenger_id, t.driver_id, b.status,
               (SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2) AS existing
        FROM bookings b JOIN trips t ON t.id = b.trip_id
        WHERE b.id = $1
      `, [bookingId, reviewerId])

      if (!booking)              return res.status(404).json({ success: false, message: 'Réservation introuvable.' })
      if (booking.passenger_id !== reviewerId) return res.status(403).json({ success: false, message: 'Seul le passager peut laisser un avis.' })
      if (!['confirmed', 'completed'].includes(booking.status)) return res.status(400).json({ success: false, message: 'Trajet non confirmé.' })
      if (booking.existing)      return res.status(409).json({ success: false, message: 'Vous avez déjà laissé un avis.' })

      const review = await queryOne(`
        INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `, [bookingId, reviewerId, booking.driver_id, rating, comment])

      res.status(201).json({ success: true, review })
    } catch (err) {
      console.error('POST /reviews:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  GET /api/reviews/driver/:driverId
//  Avis publics d'un conducteur
// ══════════════════════════════════════════════
router.get('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params

    const [reviews, stats] = await Promise.all([
      query(`
        SELECT
          r.id, r.rating, r.comment, r.created_at,
          u.first_name AS reviewer_name,
          u.avatar_color AS reviewer_color,
          t.origin_city, t.destination_city
        FROM reviews r
        JOIN users u    ON u.id = r.reviewer_id
        JOIN bookings b ON b.id = r.booking_id
        JOIN trips t    ON t.id = b.trip_id
        WHERE r.reviewee_id = $1
        ORDER BY r.created_at DESC
        LIMIT 50
      `, [driverId]),

      queryOne(`
        SELECT
          ROUND(AVG(rating)::NUMERIC, 1) AS avg_rating,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE rating = 5) AS five,
          COUNT(*) FILTER (WHERE rating = 4) AS four,
          COUNT(*) FILTER (WHERE rating = 3) AS three,
          COUNT(*) FILTER (WHERE rating = 2) AS two,
          COUNT(*) FILTER (WHERE rating = 1) AS one
        FROM reviews WHERE reviewee_id = $1
      `, [driverId]),
    ])

    res.json({
      success: true,
      reviews: reviews.rows.map(r => ({
        id:           r.id,
        rating:       r.rating,
        comment:      r.comment,
        at:           r.created_at,
        reviewerName: r.reviewer_name,
        reviewerColor:r.reviewer_color,
        reviewerAvatar: r.reviewer_name?.[0]?.toUpperCase(),
        from:         r.origin_city,
        to:           r.destination_city,
      })),
      stats: {
        avgRating: parseFloat(stats.avg_rating) || 0,
        total:     parseInt(stats.total) || 0,
        breakdown: {
          5: parseInt(stats.five)  || 0,
          4: parseInt(stats.four)  || 0,
          3: parseInt(stats.three) || 0,
          2: parseInt(stats.two)   || 0,
          1: parseInt(stats.one)   || 0,
        },
      },
    })
  } catch (err) {
    console.error('GET /reviews/driver/:id:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/reviews/can-review/:bookingId
//  Vérifie si l'utilisateur peut laisser un avis
// ══════════════════════════════════════════════
router.get('/can-review/:bookingId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId
    const { bookingId } = req.params

    const result = await queryOne(`
      SELECT
        b.passenger_id, t.driver_id, b.status,
        t.origin_city, t.destination_city,
        drv.first_name AS driver_name,
        (SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2) AS existing_review
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      JOIN users drv ON drv.id = t.driver_id
      WHERE b.id = $1
    `, [bookingId, userId])

    if (!result || result.passenger_id !== userId)
      return res.json({ success: true, canReview: false })

    res.json({
      success:      true,
      canReview:    !result.existing_review && ['confirmed', 'completed'].includes(result.status),
      alreadyReviewed: !!result.existing_review,
      driverName:   result.driver_name,
      from:         result.origin_city,
      to:           result.destination_city,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

module.exports = router
