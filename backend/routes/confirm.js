const express = require('express')
const { query, queryOne } = require('../db')
const { requireAuth }     = require('../middleware/auth')
const {
  sendTripConfirmationRequestEmail,
  sendTripCompletedEmail,
  sendTripDisputedEmail,
} = require('../utils/email')

const router = express.Router()
router.use(requireAuth)

// ══════════════════════════════════════════════════════════════
//  POST /api/confirm/:bookingId
//  Conducteur ou passager confirme que le trajet a eu lieu
// ══════════════════════════════════════════════════════════════
router.post('/:bookingId', async (req, res) => {
  try {
    const userId     = req.session.userId
    const { bookingId } = req.params

    // Récupérer la réservation avec tous les acteurs
    const booking = await queryOne(`
      SELECT
        b.*,
        t.origin_city, t.destination_city, t.departure_at,
        t.driver_id,
        drv.email AS driver_email, drv.first_name AS driver_first,
        pax.email AS pax_email,   pax.first_name AS pax_first
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE b.id = $1
    `, [bookingId])

    if (!booking)
      return res.status(404).json({ success: false, message: 'Réservation introuvable.' })

    if (booking.status !== 'confirmed')
      return res.status(400).json({ success: false, message: 'Ce trajet ne peut pas être confirmé (statut: ' + booking.status + ').' })

    // Vérifier le rôle
    const isDriver    = booking.driver_id  === userId
    const isPassenger = booking.passenger_id === userId

    if (!isDriver && !isPassenger)
      return res.status(403).json({ success: false, message: 'Accès refusé.' })

    // Vérifier que le trajet est passé
    if (new Date(booking.departure_at) > new Date())
      return res.status(400).json({ success: false, message: 'Le trajet n\'est pas encore terminé.' })

    // Vérifier doublon
    if (isDriver    && booking.driver_confirmed)
      return res.status(400).json({ success: false, message: 'Vous avez déjà confirmé ce trajet.' })
    if (isPassenger && booking.passenger_confirmed)
      return res.status(400).json({ success: false, message: 'Vous avez déjà confirmé ce trajet.' })

    // Marquer la confirmation
    const col = isDriver ? 'driver_confirmed' : 'passenger_confirmed'
    const atCol = isDriver ? 'driver_confirmed_at' : 'passenger_confirmed_at'

    const updated = await queryOne(`
      UPDATE bookings
      SET ${col} = true, ${atCol} = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING driver_confirmed, passenger_confirmed
    `, [bookingId])

    const bothConfirmed = updated.driver_confirmed && updated.passenger_confirmed

    if (bothConfirmed) {
      // ── Les deux ont confirmé → COMPLET ──────────────────────
      await query(
        `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [bookingId]
      )

      // Emails de confirmation aux deux
      await Promise.all([
        sendTripCompletedEmail({
          email:      booking.driver_email,
          name:       booking.driver_first,
          role:       'driver',
          from:       booking.origin_city,
          to:         booking.destination_city,
          bookingId,
        }).catch(console.error),
        sendTripCompletedEmail({
          email:      booking.pax_email,
          name:       booking.pax_first,
          role:       'passenger',
          from:       booking.origin_city,
          to:         booking.destination_city,
          bookingId,
          driverName: booking.driver_first,
        }).catch(console.error),
      ])

      return res.json({
        success: true,
        completed: true,
        message: '✅ Les deux parties ont confirmé. Trajet marqué comme terminé !',
      })
    }

    // ── Une seule confirmation pour l'instant ─────────────────
    // Envoyer une demande de confirmation à l'autre partie
    const otherEmail = isDriver ? booking.pax_email   : booking.driver_email
    const otherName  = isDriver ? booking.pax_first   : booking.driver_first
    const otherRole  = isDriver ? 'passenger'         : 'driver'

    sendTripConfirmationRequestEmail({
      email:       otherEmail,
      name:        otherName,
      role:        otherRole,
      confirmerName: isDriver ? booking.driver_first : booking.pax_first,
      from:        booking.origin_city,
      to:          booking.destination_city,
      bookingId,
    }).catch(console.error)

    res.json({
      success:   true,
      completed: false,
      message:   `Confirmation enregistrée. En attente de l'autre partie.`,
    })

  } catch (err) {
    console.error('POST /confirm/:bookingId:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════════════════════
//  POST /api/confirm/:bookingId/dispute
//  Contester un trajet (l'autre a confirmé mais moi non)
// ══════════════════════════════════════════════════════════════
router.post('/:bookingId/dispute', async (req, res) => {
  try {
    const userId     = req.session.userId
    const { bookingId } = req.params
    const { reason }    = req.body

    const booking = await queryOne(`
      SELECT b.*, t.driver_id, t.origin_city, t.destination_city,
        drv.email AS driver_email, drv.first_name AS driver_first,
        pax.email AS pax_email,   pax.first_name AS pax_first
      FROM bookings b
      JOIN trips t   ON t.id = b.trip_id
      JOIN users drv ON drv.id = t.driver_id
      JOIN users pax ON pax.id = b.passenger_id
      WHERE b.id = $1
    `, [bookingId])

    if (!booking) return res.status(404).json({ success: false, message: 'Réservation introuvable.' })

    const isDriver    = booking.driver_id   === userId
    const isPassenger = booking.passenger_id === userId
    if (!isDriver && !isPassenger)
      return res.status(403).json({ success: false, message: 'Accès refusé.' })

    await query(
      `UPDATE bookings
       SET status = 'disputed', disputed = true, dispute_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason || 'Aucune raison fournie.', bookingId]
    )

    // Notifier l'admin et l'autre partie
    const otherEmail = isDriver ? booking.pax_email   : booking.driver_email
    const otherName  = isDriver ? booking.pax_first   : booking.driver_first

    await sendTripDisputedEmail({
      email:         otherEmail,
      name:          otherName,
      disputerName:  isDriver ? booking.driver_first : booking.pax_first,
      from:          booking.origin_city,
      to:            booking.destination_city,
      reason:        reason,
      bookingId,
    }).catch(console.error)

    res.json({ success: true, message: 'Litige enregistré. Notre équipe va examiner la situation.' })

  } catch (err) {
    console.error('POST /confirm/:bookingId/dispute:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════════════════════
//  GET /api/confirm/:bookingId/status
//  Statut de confirmation pour une réservation
// ══════════════════════════════════════════════════════════════
router.get('/:bookingId/status', async (req, res) => {
  try {
    const userId = req.session.userId
    const booking = await queryOne(`
      SELECT b.id, b.status, b.driver_confirmed, b.passenger_confirmed,
             b.driver_confirmed_at, b.passenger_confirmed_at, b.disputed,
             t.driver_id, t.departure_at, t.origin_city, t.destination_city
      FROM bookings b JOIN trips t ON t.id = b.trip_id
      WHERE b.id = $1
    `, [req.params.bookingId])

    if (!booking) return res.status(404).json({ success: false })

    const isDriver    = booking.driver_id   === userId
    const isPassenger = booking.passenger_id === userId // Note: need passenger_id
    const iHaveConfirmed = isDriver ? booking.driver_confirmed : booking.passenger_confirmed

    res.json({
      success:           true,
      status:            booking.status,
      driverConfirmed:   booking.driver_confirmed,
      passengerConfirmed:booking.passenger_confirmed,
      iHaveConfirmed,
      disputed:          booking.disputed,
      isDriver,
      tripPast:          new Date(booking.departure_at) < new Date(),
    })
  } catch (err) {
    res.status(500).json({ success: false })
  }
})

module.exports = router
