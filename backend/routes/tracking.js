const express = require('express')
const { query, queryOne } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

// POST /api/tracking/:bookingId/start — Démarrer le trajet
router.post('/:bookingId/start', async (req, res) => {
  try {
    const { bookingId } = req.params
    const userId = req.session.userId

    // Vérifier accès
    const booking = await queryOne(
      `SELECT b.*, t.driver_id, t.origin_city, t.destination_city
       FROM bookings b JOIN trips t ON t.id = b.trip_id
       WHERE b.id = $1 AND (b.passenger_id = $2 OR t.driver_id = $2) AND b.status = 'confirmed'`,
      [bookingId, userId]
    )
    if (!booking) return res.status(403).json({ success:false, message:'Accès refusé' })

    // Marquer comme démarré
    await query(
      `UPDATE bookings SET tracking_status='in_progress', trip_started_at=NOW() WHERE id=$1 AND tracking_status='not_started'`,
      [bookingId]
    )

    // Diffuser via Socket.io
    const { getIO } = require('../socket')
    const io = getIO()
    if (io) io.to(`booking:${bookingId}`).emit('trip:started', { bookingId, at: new Date() })

    res.json({ success:true, message:'Trajet démarré' })
  } catch (err) {
    console.error('tracking start:', err)
    res.status(500).json({ success:false, message:'Erreur serveur' })
  }
})

// POST /api/tracking/:bookingId/position — Envoyer une position
router.post('/:bookingId/position', async (req, res) => {
  try {
    const { bookingId } = req.params
    const { latitude, longitude, heading, speed, accuracy } = req.body
    const userId = req.session.userId

    if (!latitude || !longitude) return res.status(400).json({ success:false, message:'Position invalide' })

    // Vérifier accès
    const booking = await queryOne(
      `SELECT b.passenger_id, t.driver_id, b.destination_lat, b.destination_lon, b.tracking_status, b.mid_trip_at, b.origin_lat, b.origin_lon
       FROM bookings b JOIN trips t ON t.id = b.trip_id
       WHERE b.id = $1`,
      [bookingId]
    )
    if (!booking) return res.status(403).json({ success:false })
    if (booking.driver_id !== userId && booking.passenger_id !== userId) return res.status(403).json({ success:false })

    const role = booking.driver_id === userId ? 'driver' : 'passenger'

    // Sauvegarder position
    await query(
      `INSERT INTO trip_tracking (booking_id, user_id, role, latitude, longitude, heading, speed, accuracy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [bookingId, userId, role, latitude, longitude, heading||null, speed||null, accuracy||null]
    )

    // Calculer progression (distance / distance totale)
    let progress = 0
    let midTripReached = false
    let arrived = false

    if (booking.origin_lat && booking.destination_lat) {
      const totalDist = haversine(booking.origin_lat, booking.origin_lon, booking.destination_lat, booking.destination_lon)
      const curDist   = haversine(latitude, longitude, booking.destination_lat, booking.destination_lon)
      progress = Math.max(0, Math.min(100, Math.round(((totalDist - curDist) / totalDist) * 100)))

      // Mi-parcours atteint ?
      if (progress >= 50 && !booking.mid_trip_at) {
        midTripReached = true
        await query(`UPDATE bookings SET mid_trip_at=NOW() WHERE id=$1`, [bookingId])
      }

      // Arrivée (< 200m de la destination) ?
      if (curDist < 0.2 && booking.tracking_status !== 'arrived') {
        arrived = true
        await query(`UPDATE bookings SET tracking_status='arrived' WHERE id=$1`, [bookingId])
      }
    }

    // Diffuser via Socket.io aux autres participants
    const { getIO } = require('../socket')
    const io = getIO()
    if (io) {
      io.to(`booking:${bookingId}`).emit('trip:position', {
        bookingId, userId, role, latitude, longitude, heading, speed, progress,
      })
      if (midTripReached) io.to(`booking:${bookingId}`).emit('trip:mid', { bookingId })
      if (arrived)        io.to(`booking:${bookingId}`).emit('trip:arrived', { bookingId })
    }

    res.json({ success:true, progress, midTripReached, arrived })
  } catch (err) {
    console.error('tracking position:', err)
    res.status(500).json({ success:false })
  }
})

// POST /api/tracking/:bookingId/end — Terminer le trajet
router.post('/:bookingId/end', async (req, res) => {
  try {
    const { bookingId } = req.params
    const userId = req.session.userId

    const booking = await queryOne(
      `SELECT b.passenger_id, t.driver_id FROM bookings b JOIN trips t ON t.id = b.trip_id WHERE b.id = $1`,
      [bookingId]
    )
    if (!booking) return res.status(403).json({ success:false })
    if (booking.driver_id !== userId && booking.passenger_id !== userId) return res.status(403).json({ success:false })

    await query(
      `UPDATE bookings SET tracking_status='completed', trip_ended_at=NOW() WHERE id=$1`,
      [bookingId]
    )

    const { getIO } = require('../socket')
    const io = getIO()
    if (io) io.to(`booking:${bookingId}`).emit('trip:completed', { bookingId })

    res.json({ success:true })
  } catch (err) {
    console.error('tracking end:', err)
    res.status(500).json({ success:false })
  }
})

// GET /api/tracking/:bookingId/positions — Historique des positions
router.get('/:bookingId/positions', async (req, res) => {
  try {
    const { bookingId } = req.params
    const userId = req.session.userId

    const booking = await queryOne(
      `SELECT b.passenger_id, t.driver_id FROM bookings b JOIN trips t ON t.id = b.trip_id WHERE b.id = $1`,
      [bookingId]
    )
    if (!booking || (booking.driver_id !== userId && booking.passenger_id !== userId)) {
      return res.status(403).json({ success:false })
    }

    const positions = await query(
      `SELECT user_id, role, latitude, longitude, heading, speed, created_at
       FROM trip_tracking WHERE booking_id = $1 ORDER BY created_at ASC LIMIT 500`,
      [bookingId]
    )
    res.json({ success:true, positions: positions.rows || positions })
  } catch (err) {
    res.status(500).json({ success:false })
  }
})

// ── Haversine : distance entre 2 points GPS (km) ──────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

module.exports = router
