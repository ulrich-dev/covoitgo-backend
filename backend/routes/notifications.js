const express = require('express')
const { query, queryOne } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

// ══════════════════════════════════════════════
//  GET /api/notifications
//  Génère les notifications depuis les données
//  existantes (messages, réservations)
// ══════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId
    const notifications = []

    // ── Nouveaux messages non lus ─────────────
    const unreadMsgs = await query(`
      SELECT
        m.id, m.content, m.created_at,
        b.id AS booking_id,
        t.origin_city, t.destination_city,
        sender.first_name AS sender_name,
        sender.avatar_color AS sender_color
      FROM messages m
      JOIN bookings b  ON b.id = m.booking_id
      JOIN trips t     ON t.id = b.trip_id
      JOIN users sender ON sender.id = m.sender_id
      WHERE m.sender_id != $1
        AND m.is_read = false
        AND (b.passenger_id = $1 OR t.driver_id = $1)
      ORDER BY m.created_at DESC
      LIMIT 10
    `, [userId])

    unreadMsgs.rows.forEach(m => {
      notifications.push({
        id:      `msg-${m.id}`,
        type:    'message',
        icon:    '💬',
        color:   '#1A9E8A',
        title:   `Message de ${m.sender_name}`,
        body:    m.content.length > 60 ? m.content.slice(0, 60) + '…' : m.content,
        link:    `/messages?booking=${m.booking_id}`,
        at:      m.created_at,
        read:    false,
      })
    })

    // ── Réservations en attente (conducteur) ──
    const pendingBookings = await query(`
      SELECT
        b.id, b.created_at, b.seats_booked,
        t.origin_city, t.destination_city, t.departure_at,
        pax.first_name AS pax_name
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE t.driver_id = $1
        AND b.status = 'pending'
        AND b.created_at > NOW() - INTERVAL '7 days'
      ORDER BY b.created_at DESC
      LIMIT 5
    `, [userId])

    pendingBookings.rows.forEach(b => {
      notifications.push({
        id:    `book-${b.id}`,
        type:  'booking_request',
        icon:  '🎫',
        color: '#FF6B35',
        title: `Demande de ${b.pax_name}`,
        body:  `${b.seats_booked} place(s) · ${b.origin_city} → ${b.destination_city}`,
        link:  `/my-trips`,
        at:    b.created_at,
        read:  false,
      })
    })

    // ── Réservation confirmée (passager) ──────
    const confirmedBookings = await query(`
      SELECT
        b.id, b.updated_at,
        t.origin_city, t.destination_city, t.departure_at,
        drv.first_name AS driver_name
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      WHERE b.passenger_id = $1
        AND b.status = 'confirmed'
        AND b.updated_at > NOW() - INTERVAL '3 days'
      ORDER BY b.updated_at DESC
      LIMIT 5
    `, [userId])

    confirmedBookings.rows.forEach(b => {
      notifications.push({
        id:    `conf-${b.id}`,
        type:  'booking_confirmed',
        icon:  '✅',
        color: '#22C55E',
        title: `Réservation confirmée !`,
        body:  `${b.driver_name} a confirmé votre place · ${b.origin_city} → ${b.destination_city}`,
        link:  `/my-trips`,
        at:    b.updated_at,
        read:  false,
      })
    })

    // Trier par date décroissante
    notifications.sort((a, b) => new Date(b.at) - new Date(a.at))

    res.json({
      success:       true,
      notifications: notifications.slice(0, 15),
      unreadCount:   notifications.filter(n => !n.read).length,
    })
  } catch (err) {
    console.error('GET /notifications:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

module.exports = router
