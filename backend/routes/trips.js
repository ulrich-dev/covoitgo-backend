const express = require('express')
const { body, query: qv, validationResult } = require('express-validator')
const { query, queryOne } = require('../db')
const { requireAuth, requireDriver } = require('../middleware/auth')
const {
  sendBookingRequestEmail,
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
} = require('../utils/email')
const { notifyMatchingAlerts } = require('./alerts')

const router = express.Router()

// Helper — calcule durée estimée en minutes (basique, km/80)
const estimateDuration = (from, to) => {
  const distances = {
    'Douala-Yaoundé':240,'Yaoundé-Douala':240,
    'Douala-Bafoussam':210,'Bafoussam-Douala':210,
    'Douala-Buea':60,'Buea-Douala':60,
    'Douala-Limbe':60,'Limbe-Douala':60,
    'Douala-Kumba':120,'Kumba-Douala':120,
    'Douala-Edéa':90,'Edéa-Douala':90,
    'Douala-Nkongsamba':150,'Nkongsamba-Douala':150,
    'Yaoundé-Bafoussam':180,'Bafoussam-Yaoundé':180,
    'Yaoundé-Kribi':180,'Kribi-Yaoundé':180,
    'Yaoundé-Ebolowa':150,'Ebolowa-Yaoundé':150,
    'Yaoundé-Bertoua':300,'Bertoua-Yaoundé':300,
    'Yaoundé-Ngaoundéré':480,'Ngaoundéré-Yaoundé':480,
    'Bafoussam-Bamenda':90,'Bamenda-Bafoussam':90,
    'Bafoussam-Dschang':60,'Dschang-Bafoussam':60,
    'Bafoussam-Foumban':90,'Foumban-Bafoussam':90,
    'Ngaoundéré-Garoua':240,'Garoua-Ngaoundéré':240,
    'Garoua-Maroua':180,'Maroua-Garoua':180,
    'Yaoundé-Mbalmayo':60,'Mbalmayo-Yaoundé':60,
    'Douala-Kribi':240,'Kribi-Douala':240,
  }
  const key = `${from}-${to}`
  const mins = distances[key] || 120
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h00`
}

// ══════════════════════════════════════════════
//  GET /api/trips/search
// ══════════════════════════════════════════════
router.get('/search', async (req, res) => {
  try {
    const { from, to, date, passengers = 1, maxPrice, sort = 'departure' } = req.query

    const conditions = ["t.status = 'active'", 't.departure_at > NOW()']
    const params = []
    let n = 1

    if (from) { conditions.push(`LOWER(t.origin_city) LIKE LOWER($${n})`); params.push(`%${from}%`); n++ }
    if (to)   { conditions.push(`LOWER(t.destination_city) LIKE LOWER($${n})`); params.push(`%${to}%`); n++ }
    if (date) { conditions.push(`DATE(t.departure_at AT TIME ZONE 'Europe/Paris') = $${n}`); params.push(date); n++ }
    if (passengers) { conditions.push(`(t.available_seats - COALESCE(b.booked,0)) >= $${n}`); params.push(parseInt(passengers)); n++ }
    if (maxPrice)   { conditions.push(`t.price_per_seat <= $${n}`); params.push(parseFloat(maxPrice)); n++ }

    const orderMap = {
      departure: 't.departure_at ASC',
      price:     't.price_per_seat ASC',
      rating:    'u.avg_rating DESC',
      seats:     'remaining DESC',
    }
    const orderBy = orderMap[sort] || 't.departure_at ASC'

    const sql = `
      SELECT
        t.id, t.origin_city AS "from", t.origin_address AS "fromAddress",
        t.destination_city AS "to", t.destination_address AS "toAddress",
        t.departure_at AS "departureAt", t.estimated_arrival AS "estimatedArrival",
        t.price_per_seat AS price, t.available_seats AS "totalSeats",
        t.preferences AS prefs, t.description, t.status,
        (t.available_seats - COALESCE(b.booked,0)) AS remaining,
        u.id AS "driverId",
        u.first_name AS "driverFirstName", u.last_name AS "driverLastName",
        u.avatar_color AS "driverColor", u.avatar_url AS "driverAvatarUrl",
        u.avg_rating AS "driverRating",
        u.review_count AS "driverReviews", u.is_verified AS "driverVerified"
      FROM trips t
      JOIN users u ON u.id = t.driver_id
      LEFT JOIN (
        SELECT trip_id, SUM(seats_booked) AS booked
        FROM bookings WHERE status IN ('pending','confirmed')
        GROUP BY trip_id
      ) b ON b.trip_id = t.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT 50
    `

    const result = await query(sql, params)

    res.json({
      success: true,
      count: result.rows.length,
      trips: result.rows.map(t => ({
        ...t,
        price:            parseFloat(t.price),
        availableSeats:   parseInt(t.remaining) || 0,
        driverRating:     parseFloat(t.driverRating) || 0,
        driverName:       `${t.driverFirstName} ${t.driverLastName[0]}.`,
        driverAvatar:     t.driverFirstName[0].toUpperCase(),
        driverAvatarUrl:  t.driverAvatarUrl || null,
        duration:         estimateDuration(t.from, t.to),
      }))
    })
  } catch (error) {
    console.error('search trips:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/trips/my — Mes trajets publiés
// ══════════════════════════════════════════════
router.get('/my', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, (t.available_seats - COALESCE(b.booked,0)) AS remaining,
              COUNT(bk.id) AS booking_count
       FROM trips t
       LEFT JOIN (
         SELECT trip_id, SUM(seats_booked) AS booked FROM bookings
         WHERE status IN ('pending','confirmed') GROUP BY trip_id
       ) b ON b.trip_id = t.id
       LEFT JOIN bookings bk ON bk.trip_id = t.id AND bk.status NOT IN ('cancelled')
       WHERE t.driver_id = $1
       GROUP BY t.id, b.booked
       ORDER BY t.departure_at DESC`,
      [req.session.userId]
    )
    res.json({ success: true, trips: result.rows })
  } catch (error) {
    console.error('my trips:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/trips/my-bookings
//  ⚠️  Doit être AVANT /:id sinon Express
//      capture "my-bookings" comme un UUID
// ══════════════════════════════════════════════
router.get('/my-bookings', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId

    // ── 1. Réservations en tant que PASSAGER ──
    const asPassenger = await query(`
      SELECT
        b.id              AS booking_id,
        b.status          AS booking_status,
        b.seats_booked,
        b.created_at      AS booking_date,
        b.message         AS booking_message,
        b.driver_confirmed,
        b.passenger_confirmed,
        t.id              AS trip_id,
        t.origin_city,    t.origin_address,
        t.destination_city, t.destination_address,
        t.departure_at,   t.estimated_arrival,
        t.price_per_seat, t.preferences, t.description,
        drv.id            AS driver_id,
        drv.first_name    AS driver_first,
        drv.last_name     AS driver_last,
        drv.avatar_color  AS driver_color,
        drv.avg_rating    AS driver_rating,
        drv.review_count  AS driver_reviews,
        drv.phone         AS driver_phone,
        (SELECT COUNT(*) FROM messages m
         WHERE m.booking_id = b.id AND m.is_read = false AND m.sender_id != $1
        ) AS unread_count
      FROM bookings b
      JOIN trips t   ON t.id = b.trip_id
      JOIN users drv ON drv.id = t.driver_id
      WHERE b.passenger_id = $1
      ORDER BY t.departure_at DESC
    `, [userId])

    // ── 2. Tous mes TRAJETS publiés (avec leurs réservations agrégées) ──
    const myTrips = await query(`
      SELECT
        t.id, t.origin_city, t.origin_address,
        t.destination_city, t.destination_address,
        t.departure_at, t.estimated_arrival,
        t.price_per_seat, t.available_seats,
        t.status AS trip_status,
        t.preferences, t.description, t.created_at,

        -- Réservations en attente
        COUNT(b.id) FILTER (WHERE b.status = 'pending')   AS pending_count,
        -- Réservations confirmées
        COUNT(b.id) FILTER (WHERE b.status = 'confirmed') AS confirmed_count,
        -- Places restantes
        t.available_seats - COALESCE(SUM(b.seats_booked) FILTER (
          WHERE b.status IN ('pending','confirmed')
        ), 0) AS remaining_seats,
        -- Messages non lus total sur ce trajet
        COALESCE((
          SELECT COUNT(*) FROM messages m
          JOIN bookings bk ON bk.id = m.booking_id
          WHERE bk.trip_id = t.id
            AND m.is_read = false
            AND m.sender_id != $1
        ), 0) AS unread_count

      FROM trips t
      LEFT JOIN bookings b ON b.trip_id = t.id AND b.status != 'cancelled'
      WHERE t.driver_id = $1
      GROUP BY t.id
      ORDER BY t.departure_at DESC
    `, [userId])

    // ── 3. Réservations individuelles par trajet (pour afficher les passagers) ──
    const bookingsByTrip = await query(`
      SELECT
        b.id AS booking_id, b.status AS booking_status,
        b.seats_booked, b.created_at AS booking_date,
        b.trip_id,
        b.driver_confirmed, b.passenger_confirmed,
        pax.id AS pax_id, pax.first_name AS pax_first,
        pax.last_name AS pax_last, pax.avatar_color AS pax_color,
        pax.avg_rating AS pax_rating, pax.phone AS pax_phone,
        (SELECT COUNT(*) FROM messages m
         WHERE m.booking_id = b.id AND m.is_read = false AND m.sender_id != $1
        ) AS unread_count
      FROM bookings b
      JOIN trips t   ON t.id = b.trip_id
      JOIN users pax ON pax.id = b.passenger_id
      WHERE t.driver_id = $1 AND b.status != 'cancelled'
      ORDER BY b.created_at DESC
    `, [userId])

    // Grouper les réservations par trip_id
    const bookingsByTripMap = {}
    for (const row of bookingsByTrip.rows) {
      if (!bookingsByTripMap[row.trip_id]) bookingsByTripMap[row.trip_id] = []
      bookingsByTripMap[row.trip_id].push({
        bookingId:         row.booking_id,
        bookingStatus:     row.booking_status,
        seatsBooked:       row.seats_booked,
        bookingDate:       row.booking_date,
        driverConfirmed:   row.driver_confirmed   || false,
        passengerConfirmed:row.passenger_confirmed || false,
        unreadCount:       parseInt(row.unread_count) || 0,
        passenger: {
          id:     row.pax_id,
          name:   `${row.pax_first} ${row.pax_last}`,
          avatar: row.pax_first[0].toUpperCase(),
          color:  row.pax_color || '#FF6B35',
          rating: parseFloat(row.pax_rating) || 0,
          phone:  row.pax_phone,
        },
      })
    }

    // Formater les trajets conducteur
    const asDriver = myTrips.rows.map(row => ({
      type:          'my_trip',   // distingue d'une réservation
      tripId:        row.id,
      tripStatus:    row.trip_status,
      role:          'driver',
      trip: {
        id:             row.id,
        from:           row.origin_city,
        fromAddress:    row.origin_address,
        to:             row.destination_city,
        toAddress:      row.destination_address,
        departureAt:    row.departure_at,
        arrivalAt:      row.estimated_arrival,
        price:          parseFloat(row.price_per_seat),
        totalSeats:     row.available_seats,
        remainingSeats: parseInt(row.remaining_seats) || row.available_seats,
        prefs:          row.preferences || [],
        description:    row.description,
      },
      stats: {
        pendingCount:   parseInt(row.pending_count)   || 0,
        confirmedCount: parseInt(row.confirmed_count) || 0,
      },
      bookings:    bookingsByTripMap[row.id] || [],
      unreadCount: parseInt(row.unread_count) || 0,
    }))

    // Formater les réservations passager
    const fmtPassenger = (row) => ({
      type:          'booking',
      bookingId:      row.booking_id,
      bookingStatus:  row.booking_status,
      seatsBooked:    row.seats_booked,
      bookingDate:    row.booking_date,
      bookingMessage: row.booking_message,
      driverConfirmed:   row.driver_confirmed   || false,
      passengerConfirmed:row.passenger_confirmed || false,
      role:           'passenger',
      trip: {
        id:          row.trip_id,
        from:        row.origin_city,
        fromAddress: row.origin_address,
        to:          row.destination_city,
        toAddress:   row.destination_address,
        departureAt: row.departure_at,
        arrivalAt:   row.estimated_arrival,
        price:       parseFloat(row.price_per_seat),
        prefs:       row.preferences || [],
        description: row.description,
      },
      other: {
        id:      row.driver_id,
        name:    `${row.driver_first} ${row.driver_last}`,
        avatar:  row.driver_first[0].toUpperCase(),
        color:   row.driver_color || '#1A9E8A',
        rating:  parseFloat(row.driver_rating) || 0,
        reviews: parseInt(row.driver_reviews) || 0,
        phone:   row.driver_phone,
        role:    'driver',
      },
      unreadCount: parseInt(row.unread_count) || 0,
    })

    res.json({
      success:     true,
      asPassenger: asPassenger.rows.map(fmtPassenger),
      asDriver,
    })
  } catch (err) {
    console.error('GET /trips/my-bookings:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  PATCH /api/trips/bookings/:bookingId/status
//  ⚠️  Aussi avant /:id
// ══════════════════════════════════════════════
router.patch('/bookings/:bookingId/status', requireAuth, async (req, res) => {
  try {
    const { status }    = req.body
    const userId        = req.session.userId
    const { bookingId } = req.params

    if (!['confirmed', 'cancelled'].includes(status))
      return res.status(400).json({ success: false, message: 'Statut invalide.' })

    const booking = await queryOne(`
      SELECT b.*, t.driver_id FROM bookings b
      JOIN trips t ON t.id = b.trip_id
      WHERE b.id = $1
    `, [bookingId])

    if (!booking)
      return res.status(404).json({ success: false, message: 'Réservation introuvable.' })
    if (booking.driver_id !== userId && booking.passenger_id !== userId)
      return res.status(403).json({ success: false, message: 'Accès refusé.' })
    if (status === 'confirmed' && booking.driver_id !== userId)
      return res.status(403).json({ success: false, message: 'Seul le conducteur peut confirmer.' })

    const updated = await queryOne(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, bookingId]
    )

    // ── Emails selon le nouveau statut ─────────
    try {
      const fullData = await queryOne(`
        SELECT
          b.seats_booked,
          t.origin_city, t.destination_city, t.departure_at,
          t.origin_address,
          drv.email AS driver_email, drv.first_name AS driver_first, drv.phone AS driver_phone, drv.language AS drv_lang,
          pax.email AS pax_email, pax.first_name AS pax_first, pax.language AS pax_lang
        FROM bookings b
        JOIN trips t   ON t.id = b.trip_id
        JOIN users drv ON drv.id = t.driver_id
        JOIN users pax ON pax.id = b.passenger_id
        WHERE b.id = $1
      `, [bookingId])

      if (fullData) {
        const { origin_city: from, destination_city: to, departure_at } = fullData

        if (status === 'confirmed') {
          sendBookingConfirmedEmail({
            passengerEmail: fullData.pax_email,
            passengerName:  fullData.pax_first,
            driverName:     fullData.driver_first,
            driverPhone:    fullData.driver_phone,
            from, to, departureAt: departure_at,
            fromAddress:    fullData.origin_address,
            lang:           fullData.pax_lang || 'en',
          }).catch(console.error)
        }

        if (status === 'cancelled') {
          const cancelledBy    = booking.driver_id === userId ? 'driver' : 'passenger'
          const recipientEmail = cancelledBy === 'driver' ? fullData.pax_email    : fullData.driver_email
          const recipientName  = cancelledBy === 'driver' ? fullData.pax_first    : fullData.driver_first
          const recipientLang  = cancelledBy === 'driver' ? fullData.pax_lang     : fullData.drv_lang
          sendBookingCancelledEmail({
            email: recipientEmail, name: recipientName,
            from, to, departureAt: departure_at, cancelledBy,
            lang: recipientLang || 'en',
          }).catch(console.error)
        }
      }
    } catch (emailErr) {
      console.error('Email error (non-blocking):', emailErr)
    }

    res.json({ success: true, booking: updated })
  } catch (err) {
    console.error('PATCH /bookings/:id/status:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/trips/:id
// ══════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const trip = await queryOne(
      `SELECT t.*, u.first_name, u.last_name, u.avatar_color, u.avg_rating,
              u.review_count, u.bio AS driver_bio, u.is_verified,
              u.created_at AS driver_since,
              (t.available_seats - COALESCE(b.booked,0)) AS remaining
       FROM trips t
       JOIN users u ON u.id = t.driver_id
       LEFT JOIN (
         SELECT trip_id, SUM(seats_booked) AS booked FROM bookings
         WHERE status IN ('pending','confirmed') GROUP BY trip_id
       ) b ON b.trip_id = t.id
       WHERE t.id = $1`,
      [req.params.id]
    )
    if (!trip) return res.status(404).json({ success: false, message: 'Trajet introuvable.' })
    res.json({ success: true, trip })
  } catch (error) {
    console.error('get trip:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/trips — Créer un trajet
// ══════════════════════════════════════════════
router.post('/',
  requireAuth,
  [
    body('originCity').trim().notEmpty().withMessage('Ville de départ requise.'),
    body('destinationCity').trim().notEmpty().withMessage("Ville d'arrivée requise."),
    body('departureAt').isISO8601().withMessage('Date invalide.'),
    body('availableSeats').isInt({ min:1, max:8 }).withMessage('1 à 8 places.'),
    body('pricePerSeat').isFloat({ min:0.5 }).withMessage('Prix invalide.'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success:false, message:errors.array()[0].msg })

      const {
        originCity, originAddress='', destinationCity, destinationAddress='',
        departureAt, availableSeats, pricePerSeat, description='', preferences=[]
      } = req.body

      // Vérif que la date est dans le futur
      if (new Date(departureAt) < new Date()) {
        return res.status(400).json({ success:false, message:'La date de départ doit être dans le futur.' })
      }

      // ── Vérification freemium ────────────────────────────────
      const driverAccount = await queryOne(
        `SELECT free_trips_left, balance_due, payment_blocked, trips_published
         FROM users WHERE id = $1`,
        [req.session.userId]
      )

      const freeLeft   = parseInt(driverAccount?.free_trips_left ?? 10)
      const balanceDue = parseFloat(driverAccount?.balance_due ?? 0)
      const blocked    = driverAccount?.payment_blocked && balanceDue > 0

      // Bloqué pour impayé
      if (blocked) {
        return res.status(402).json({
          success:     false,
          blocked:     true,
          reason:      'payment_required',
          balanceDue,
          message:     `Votre compte est bloqué. Vous devez régler ${balanceDue.toLocaleString('fr-FR')} FCFA avant de publier un nouveau trajet.`,
        })
      }

      // Un conducteur ne peut pas publier 2 trajets exactement au même moment
      const conflict = await queryOne(
        `SELECT id FROM trips WHERE driver_id=$1 AND departure_at=$2 AND status != 'cancelled'`,
        [req.session.userId, departureAt]
      )
      if (conflict) return res.status(409).json({ success:false, message:'Vous avez déjà un trajet à cet horaire.' })

      const trip = await queryOne(
        `INSERT INTO trips
           (driver_id,origin_city,origin_address,destination_city,destination_address,
            departure_at,available_seats,price_per_seat,description,preferences)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [req.session.userId, originCity, originAddress, destinationCity, destinationAddress,
         departureAt, availableSeats, pricePerSeat, description, preferences]
      )

      // ── Mise à jour compteur freemium ────────────────────────
      if (freeLeft > 0) {
        // Encore des trajets gratuits
        await query(
          `UPDATE users SET trips_published = trips_published + 1, free_trips_left = free_trips_left - 1 WHERE id = $1`,
          [req.session.userId]
        )
      } else {
        // Plus de trajets gratuits → calculer la commission et bloquer
        const commission = Math.round(parseFloat(pricePerSeat) * availableSeats * 0.10)
        await query(
          `UPDATE users
           SET trips_published = trips_published + 1,
               balance_due     = balance_due + $1,
               payment_blocked = true
           WHERE id = $2`,
          [commission, req.session.userId]
        )
      }

      res.status(201).json({
        success:true, message:'Trajet publié avec succès !',
        trip: { ...trip, duration: estimateDuration(originCity, destinationCity) },
        freemium: {
          freeLeft:    Math.max(0, freeLeft - 1),
          freeTrips:   10,
          nowBlocked:  freeLeft <= 1,
        }
      })

      // Notifier les utilisateurs avec des alertes/favoris correspondants (non bloquant)
      setImmediate(() => notifyMatchingAlerts(trip).catch(() => {}))
    } catch (error) {
      console.error('create trip:', error)
      res.status(500).json({ success:false, message:'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  DELETE /api/trips/:id — Annuler un trajet
// ══════════════════════════════════════════════
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const trip = await queryOne('SELECT driver_id, status FROM trips WHERE id=$1', [req.params.id])
    if (!trip) return res.status(404).json({ success:false, message:'Trajet introuvable.' })
    if (trip.driver_id !== req.session.userId) return res.status(403).json({ success:false, message:'Non autorisé.' })
    if (trip.status === 'cancelled') return res.status(400).json({ success:false, message:'Déjà annulé.' })

    await query("UPDATE trips SET status='cancelled' WHERE id=$1", [req.params.id])
    res.json({ success:true, message:'Trajet annulé.' })
  } catch (error) {
    res.status(500).json({ success:false, message:'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/trips/:id/book — Réserver une place
// ══════════════════════════════════════════════
router.post('/:id/book', requireAuth,
  [
    body('seatsBooked').optional().isInt({ min:1, max:4 }),
    body('message').optional().isLength({ max:500 }),
  ],
  async (req, res) => {
    try {
      const { seatsBooked = 1, message = '' } = req.body
      const tripId = req.params.id
      const passengerId = req.session.userId

      const trip = await queryOne(
        `SELECT t.driver_id, t.status, t.departure_at,
                (t.available_seats - COALESCE(b.booked,0)) AS remaining
         FROM trips t
         LEFT JOIN (
           SELECT trip_id, SUM(seats_booked) AS booked FROM bookings
           WHERE status IN ('pending','confirmed') GROUP BY trip_id
         ) b ON b.trip_id = t.id
         WHERE t.id=$1`,
        [tripId]
      )

      if (!trip) return res.status(404).json({ success:false, message:'Trajet introuvable.' })
      if (trip.driver_id === passengerId) return res.status(400).json({ success:false, message:'Vous ne pouvez pas réserver votre propre trajet.' })
      if (trip.status !== 'active') return res.status(400).json({ success:false, message:'Ce trajet n\'est plus disponible.' })
      if (new Date(trip.departure_at) < new Date()) return res.status(400).json({ success:false, message:'Ce trajet est déjà parti.' })
      if (parseInt(trip.remaining) < seatsBooked) return res.status(400).json({ success:false, message:'Plus assez de places disponibles.' })

      // ── Vérifier si un inquiry (contact sans réservation) existe déjà ──
      // Si oui → upgrader en pending (pas de nouvel INSERT)
      const existing = await queryOne(
        `SELECT id, status FROM bookings WHERE trip_id=$1 AND passenger_id=$2`,
        [tripId, passengerId]
      )

      let booking
      if (existing && existing.status === 'inquiry') {
        // Upgrader l'inquiry en vraie réservation pending
        booking = await queryOne(
          `UPDATE bookings
           SET status='pending', seats_booked=$1, message=$2, updated_at=NOW()
           WHERE id=$3 RETURNING *`,
          [seatsBooked, message, existing.id]
        )
      } else if (existing && existing.status !== 'cancelled') {
        return res.status(409).json({ success:false, message:'Vous avez déjà une réservation en cours pour ce trajet.' })
      } else {
        booking = await queryOne(
          `INSERT INTO bookings (trip_id,passenger_id,seats_booked,message)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [tripId, passengerId, seatsBooked, message]
        )
      }

      // ── Email au conducteur ────────────────────
      const [driver, passenger, tripInfo] = await Promise.all([
        queryOne('SELECT email, first_name, language FROM users WHERE id = $1', [trip.driver_id]),
        queryOne('SELECT first_name, last_name FROM users WHERE id = $1', [passengerId]),
        queryOne('SELECT origin_city, destination_city, departure_at FROM trips WHERE id = $1', [tripId]),
      ])
      if (driver && passenger && tripInfo) {
        sendBookingRequestEmail({
          driverEmail:   driver.email,
          driverName:    driver.first_name,
          passengerName: `${passenger.first_name} ${passenger.last_name}`,
          from:          tripInfo.origin_city,
          to:            tripInfo.destination_city,
          departureAt:   tripInfo.departure_at,
          seats:         seatsBooked,
          bookingId:     booking.id,
          lang:          driver.language || 'en',
        }).catch(console.error)
      }

      res.status(201).json({ success:true, message:'Réservation envoyée au conducteur !', booking })
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success:false, message:'Vous avez déjà réservé ce trajet.' })
      console.error('book trip:', error)
      res.status(500).json({ success:false, message:'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  POST /api/trips/:id/contact
//  Contacter un conducteur : envoie UNIQUEMENT un message direct
//  sans créer de réservation. La réservation reste sur /book.
// ══════════════════════════════════════════════
router.post('/:id/contact', requireAuth,
  [ body('message').trim().notEmpty().isLength({ max: 1000 }) ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Le message ne peut pas être vide.' })
      }

      const tripId      = req.params.id
      const passengerId = req.session.userId
      const { message } = req.body

      // Récupérer le trajet
      const trip = await queryOne(
        `SELECT t.driver_id, t.status, t.departure_at
         FROM trips t WHERE t.id = $1`,
        [tripId]
      )
      if (!trip)
        return res.status(404).json({ success: false, message: 'Trajet introuvable.' })
      if (trip.driver_id === passengerId)
        return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous contacter vous-même.' })
      if (trip.status !== 'active')
        return res.status(400).json({ success: false, message: 'Ce trajet n\'est plus disponible.' })

      // Chercher une réservation existante (si l'utilisateur a déjà réservé)
      let booking = await queryOne(
        `SELECT * FROM bookings
         WHERE trip_id = $1 AND passenger_id = $2
           AND status != 'cancelled'`,
        [tripId, passengerId]
      )

      // ── Pas de réservation → créer une conversation "inquiry" sans réserver ──
      // seats_booked = 1 pour satisfaire la contrainte SQL (>= 1)
      // mais status = 'inquiry' signifie que ce n'est PAS une vraie réservation
      if (!booking) {
        booking = await queryOne(
          `INSERT INTO bookings (trip_id, passenger_id, seats_booked, message, status)
           VALUES ($1, $2, 1, $3, 'inquiry')
           RETURNING *`,
          [tripId, passengerId, message]
        )
      }

      // Envoyer le message dans la conversation
      const msg = await queryOne(
        `INSERT INTO messages (booking_id, sender_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [booking.id, passengerId, message]
      )

      // Infos expéditeur pour la réponse
      const sender = await queryOne(
        'SELECT first_name, avatar_color FROM users WHERE id = $1',
        [passengerId]
      )

      res.status(201).json({
        success:   true,
        bookingId: booking.id,
        message: {
          id:         msg.id,
          content:    msg.content,
          isFromMe:   true,
          senderName: sender.first_name,
          avatar:     sender.first_name[0].toUpperCase(),
          color:      sender.avatar_color,
          isRead:     false,
          at:         msg.created_at,
        },
      })
    } catch (err) {
      console.error('POST /trips/:id/contact:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)


// ══════════════════════════════════════════════
//  PATCH /api/trips/:id — Modifier un trajet
// ══════════════════════════════════════════════
router.patch('/:id', requireAuth,
  [
    body('originAddress').optional().isString(),
    body('destinationAddress').optional().isString(),
    body('availableSeats').optional().isInt({ min: 1, max: 8 }),
    body('pricePerSeat').optional().isFloat({ min: 0 }),
    body('description').optional().isString(),
    body('departureAt').optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params
      const userId = req.session.userId

      const trip = await queryOne(
        `SELECT * FROM trips WHERE id = $1 AND driver_id = $2`,
        [id, userId]
      )
      if (!trip) return res.status(404).json({ success: false, message: 'Trajet introuvable ou accès refusé.' })
      if (trip.status === 'cancelled') return res.status(400).json({ success: false, message: 'Impossible de modifier un trajet annulé.' })

      const { originAddress, destinationAddress, availableSeats, pricePerSeat, description, departureAt, preferences } = req.body
      const sets   = ['updated_at = NOW()']
      const params = []
      let n = 1

      if (originAddress      !== undefined) { sets.push(`origin_address = $${n}`);      params.push(originAddress);      n++ }
      if (destinationAddress !== undefined) { sets.push(`destination_address = $${n}`); params.push(destinationAddress); n++ }
      if (availableSeats     !== undefined) { sets.push(`available_seats = $${n}`);     params.push(availableSeats);     n++ }
      if (pricePerSeat       !== undefined) { sets.push(`price_per_seat = $${n}`);      params.push(pricePerSeat);       n++ }
      if (description        !== undefined) { sets.push(`description = $${n}`);         params.push(description);        n++ }
      if (departureAt        !== undefined) { sets.push(`departure_at = $${n}`);        params.push(departureAt);        n++ }
      if (preferences        !== undefined) { sets.push(`preferences = $${n}`);         params.push(preferences);        n++ }

      params.push(id)
      const updated = await queryOne(
        `UPDATE trips SET ${sets.join(', ')} WHERE id = $${n} RETURNING *`,
        params
      )
      res.json({ success: true, trip: updated })
    } catch (err) {
      console.error('PATCH /trips/:id:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

module.exports = router
