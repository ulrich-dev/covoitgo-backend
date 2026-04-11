/**
 * scheduler.js — Notifications automatiques Clando
 * Tourne toutes les minutes via node-cron
 *
 * Rappels de départ  : 15 min et 5 min avant
 * Demande d'avis     : 4h après l'arrivée estimée
 */

const cron    = require('node-cron')
const { query } = require('./db')
const {
  sendDepartureReminderEmail,
  sendReviewRequestEmail,
} = require('./utils/email')

// Empêche d'envoyer le même email deux fois (redémarrage serveur, etc.)
// On marque les rappels déjà envoyés dans une colonne de la table bookings
// → migration_scheduler.sql doit être appliquée

async function runDepartureReminders() {
  try {
    const now = new Date()

    // ── Rappel 15 min ────────────────────────────────────────
    const soon15 = await query(`
      SELECT
        b.id AS booking_id,
        b.reminder_15_sent,
        t.departure_at, t.origin_city, t.destination_city,
        drv.email AS driver_email, drv.first_name AS driver_first,
        pax.email AS pax_email,   pax.first_name AS pax_first
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE b.status = 'confirmed'
        AND b.reminder_15_sent = false
        AND t.departure_at BETWEEN NOW() + INTERVAL '14 minutes'
                                AND NOW() + INTERVAL '16 minutes'
    `)

    for (const row of soon15.rows) {
      await Promise.all([
        sendDepartureReminderEmail({
          email:     row.driver_email,
          name:      row.driver_first,
          role:      'driver',
          from:      row.origin_city,
          to:        row.destination_city,
          departAt:  row.departure_at,
          minutesLeft: 15,
        }).catch(console.error),
        sendDepartureReminderEmail({
          email:     row.pax_email,
          name:      row.pax_first,
          role:      'passenger',
          from:      row.origin_city,
          to:        row.destination_city,
          departAt:  row.departure_at,
          minutesLeft: 15,
        }).catch(console.error),
      ])
      await query(
        `UPDATE bookings SET reminder_15_sent = true WHERE id = $1`,
        [row.booking_id]
      )
      console.log(`📬 Rappel 15min → ${row.driver_email} & ${row.pax_email}`)
    }

    // ── Rappel 5 min ─────────────────────────────────────────
    const soon5 = await query(`
      SELECT
        b.id AS booking_id,
        b.reminder_5_sent,
        t.departure_at, t.origin_city, t.destination_city, t.origin_address,
        drv.email AS driver_email, drv.first_name AS driver_first, drv.phone AS driver_phone,
        pax.email AS pax_email,   pax.first_name AS pax_first
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE b.status = 'confirmed'
        AND b.reminder_5_sent = false
        AND t.departure_at BETWEEN NOW() + INTERVAL '4 minutes'
                                AND NOW() + INTERVAL '6 minutes'
    `)

    for (const row of soon5.rows) {
      await Promise.all([
        sendDepartureReminderEmail({
          email:     row.driver_email,
          name:      row.driver_first,
          role:      'driver',
          from:      row.origin_city,
          to:        row.destination_city,
          departAt:  row.departure_at,
          minutesLeft: 5,
          meetPoint: row.origin_address,
        }).catch(console.error),
        sendDepartureReminderEmail({
          email:     row.pax_email,
          name:      row.pax_first,
          role:      'passenger',
          from:      row.origin_city,
          to:        row.destination_city,
          departAt:  row.departure_at,
          minutesLeft: 5,
          meetPoint:   row.origin_address,
          driverPhone: row.driver_phone,
        }).catch(console.error),
      ])
      await query(
        `UPDATE bookings SET reminder_5_sent = true WHERE id = $1`,
        [row.booking_id]
      )
      console.log(`📬 Rappel 5min → ${row.driver_email} & ${row.pax_email}`)
    }

    // ── Demande d'avis 4h après l'arrivée ───────────────────
    const toReview = await query(`
      SELECT
        b.id AS booking_id,
        b.review_request_sent,
        t.estimated_arrival, t.departure_at,
        t.origin_city, t.destination_city,
        drv.id AS driver_id, drv.first_name AS driver_first,
        pax.email AS pax_email, pax.first_name AS pax_first,
        -- Vérifier qu'il n'y a pas déjà un avis
        (SELECT id FROM reviews WHERE booking_id = b.id AND reviewer_id = pax.id) AS existing_review
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE b.status = 'confirmed'
        AND b.review_request_sent = false
        AND (
          -- Si arrivée estimée renseignée : 4h après
          (t.estimated_arrival IS NOT NULL
            AND t.estimated_arrival < NOW() - INTERVAL '4 hours')
          OR
          -- Sinon : 4h après le départ (fallback)
          (t.estimated_arrival IS NULL
            AND t.departure_at < NOW() - INTERVAL '4 hours')
        )
    `)

    for (const row of toReview.rows) {
      if (!row.existing_review) {
        await sendReviewRequestEmail({
          email:      row.pax_email,
          name:       row.pax_first,
          driverName: row.driver_first,
          from:       row.origin_city,
          to:         row.destination_city,
          bookingId:  row.booking_id,
          driverId:   row.driver_id,
        }).catch(console.error)
        console.log(`📬 Demande d'avis → ${row.pax_email}`)
      }
      await query(
        `UPDATE bookings SET review_request_sent = true WHERE id = $1`,
        [row.booking_id]
      )
    }

    // ── Notification "confirmez votre trajet" (1h après le départ estimé) ──
    const needsConfirm = await query(`
      SELECT
        b.id AS booking_id,
        t.origin_city, t.destination_city, t.departure_at,
        drv.email AS driver_email, drv.first_name AS driver_first,
        pax.email AS pax_email,   pax.first_name AS pax_first
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE b.status = 'confirmed'
        AND b.confirm_notif_sent = false
        AND t.departure_at < NOW() - INTERVAL '1 hour'
        AND t.departure_at > NOW() - INTERVAL '25 hours'
    `)

    for (const row of needsConfirm.rows) {
      const { sendTripConfirmationRequestEmail } = require('./utils/email')
      // Envoyer aux deux simultanément
      await Promise.all([
        sendTripConfirmationRequestEmail({
          email:         row.driver_email,
          name:          row.driver_first,
          role:          'driver',
          confirmerName: 'Clando',
          from:          row.origin_city,
          to:            row.destination_city,
          bookingId:     row.booking_id,
        }).catch(console.error),
        sendTripConfirmationRequestEmail({
          email:         row.pax_email,
          name:          row.pax_first,
          role:          'passenger',
          confirmerName: 'Clando',
          from:          row.origin_city,
          to:            row.destination_city,
          bookingId:     row.booking_id,
        }).catch(console.error),
      ])
      await query(`UPDATE bookings SET confirm_notif_sent = true WHERE id = $1`, [row.booking_id])
      console.log(`📬 Confirm request → ${row.driver_email} & ${row.pax_email}`)
    }

    // ── Auto-validation 24h après départ (si au moins 1 confirmation) ──────
    const autoComplete = await query(`
      SELECT
        b.id AS booking_id,
        b.driver_confirmed, b.passenger_confirmed,
        t.origin_city, t.destination_city, t.departure_at, t.driver_id,
        drv.email AS driver_email, drv.first_name AS driver_first,
        pax.email AS pax_email,   pax.first_name AS pax_first
      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id
      WHERE b.status = 'confirmed'
        AND b.disputed = false
        AND t.departure_at < NOW() - INTERVAL '24 hours'
        AND (b.driver_confirmed = true OR b.passenger_confirmed = true)
    `)

    for (const row of autoComplete.rows) {
      await query(
        `UPDATE bookings
         SET status = 'completed',
             driver_confirmed    = true,
             passenger_confirmed = true,
             updated_at = NOW()
         WHERE id = $1`,
        [row.booking_id]
      )

      const { sendTripCompletedEmail } = require('./utils/email')
      const confirmedBy = row.driver_confirmed ? row.driver_first : row.pax_first

      await Promise.all([
        sendTripCompletedEmail({
          email:  row.driver_email, name: row.driver_first, role: 'driver',
          from:   row.origin_city,  to:   row.destination_city,
          bookingId: row.booking_id,
        }).catch(console.error),
        sendTripCompletedEmail({
          email:      row.pax_email, name: row.pax_first, role: 'passenger',
          from:       row.origin_city, to: row.destination_city,
          bookingId:  row.booking_id, driverName: row.driver_first,
        }).catch(console.error),
      ])
      console.log(`✅ Auto-completed booking ${row.booking_id} (${confirmedBy} avait confirmé)`)
    }

    // ── Auto-annulation 48h après départ (aucune confirmation) ──────────────
    const autoCancel = await query(`
      SELECT b.id AS booking_id,
             t.origin_city, t.destination_city
      FROM bookings b
      JOIN trips t ON t.id = b.trip_id
      WHERE b.status = 'confirmed'
        AND b.disputed = false
        AND b.driver_confirmed    = false
        AND b.passenger_confirmed = false
        AND t.departure_at < NOW() - INTERVAL '48 hours'
    `)

    for (const row of autoCancel.rows) {
      await query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [row.booking_id]
      )
      console.log(`❌ Auto-cancelled booking ${row.booking_id} (aucune confirmation en 48h)`)
    }

  } catch (err) {
    console.error('[scheduler] Erreur:', err.message)
  }
}

function startScheduler() {
  // Toutes les minutes
  cron.schedule('* * * * *', runDepartureReminders)
  console.log('  ⏰  Scheduler démarré (rappels départ + demandes d\'avis)')
}

module.exports = { startScheduler }
