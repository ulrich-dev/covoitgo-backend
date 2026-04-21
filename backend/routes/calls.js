const express    = require('express')
const { RtcTokenBuilder, RtcRole } = require('agora-token')
const { queryOne } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const APP_ID          = process.env.AGORA_APP_ID
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE

// ══════════════════════════════════════════════
//  POST /api/calls/token
//  Générer un token Agora pour rejoindre un canal vocal
// ══════════════════════════════════════════════
router.post('/token', async (req, res) => {
  try {
    if (!APP_ID || !APP_CERTIFICATE) {
      return res.status(503).json({ success: false, message: 'Service d\'appel non configuré.' })
    }

    const { bookingId } = req.body
    const userId = req.session.userId

    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId requis.' })

    // Vérifier que l'utilisateur est bien dans cette réservation
    const booking = await queryOne(
      `SELECT b.id, b.status, b.passenger_id, t.driver_id,
              u_drv.first_name AS driver_name, u_drv.phone AS driver_phone,
              u_pax.first_name AS passenger_name,
              t.origin_city AS from_city, t.destination_city AS to_city
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u_drv ON u_drv.id = t.driver_id
       JOIN users u_pax ON u_pax.id = b.passenger_id
       WHERE b.id = $1
         AND (b.passenger_id = $2 OR t.driver_id = $2)
         AND b.status = 'confirmed'`,
      [bookingId, userId]
    )

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: 'Réservation introuvable ou non confirmée.'
      })
    }

    // Canal unique par réservation
    const channelName = `clando_booking_${bookingId}`

    // UID numérique pour Agora (hash simple de l'userId)
    const uid = Math.abs(userId.split('-').join('').slice(0, 8).split('')
      .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 100000

    // Token valide 1 heure
    const expireTime = Math.floor(Date.now() / 1000) + 3600
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireTime,
      expireTime
    )

    // Qui appelle qui ?
    const isDriver    = booking.driver_id === userId
    const otherName   = isDriver ? booking.passenger_name : booking.driver_name

    res.json({
      success: true,
      token,
      channelName,
      uid,
      appId: APP_ID,
      otherName,
      from:  booking.from_city,
      to:    booking.to_city,
    })
  } catch (err) {
    console.error('POST /calls/token:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/calls/notify
//  Notifier l'autre partie via Socket.io
// ══════════════════════════════════════════════
router.post('/notify', async (req, res) => {
  try {
    const { bookingId, action } = req.body // action: 'calling' | 'accepted' | 'rejected' | 'ended'
    const userId = req.session.userId

    const booking = await queryOne(
      `SELECT b.passenger_id, t.driver_id, u.first_name AS caller_name
       FROM bookings b
       JOIN trips t ON t.id = b.trip_id
       JOIN users u ON u.id = $2
       WHERE b.id = $1 AND (b.passenger_id = $2 OR t.driver_id = $2)`,
      [bookingId, userId]
    )

    if (!booking) return res.status(403).json({ success: false })

    const recipientId = booking.driver_id === userId
      ? booking.passenger_id
      : booking.driver_id

    // Émettre via Socket.io
    const { getIO } = require('../socket')
    const io = getIO()
    if (io) {
      io.to(`user_${recipientId}`).emit('incoming_call', {
        bookingId,
        callerName: booking.caller_name,
        action,
        channelName: `clando_booking_${bookingId}`,
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('POST /calls/notify:', err)
    res.status(500).json({ success: false })
  }
})

module.exports = router
