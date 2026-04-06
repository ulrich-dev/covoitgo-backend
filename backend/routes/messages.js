const express = require('express')
const { body, validationResult } = require('express-validator')
const { query, queryOne } = require('../db')
const { requireAuth } = require('../middleware/auth')
const { sendNewMessageEmail } = require('../utils/email')

const router = express.Router()

// Toutes les routes nécessitent d'être connecté
router.use(requireAuth)

// ══════════════════════════════════════════════
//  GET /api/messages
//  Liste toutes les conversations de l'utilisateur
//  (une conversation = une réservation)
// ══════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId

    const result = await query(`
      SELECT
        b.id            AS booking_id,
        b.status        AS booking_status,
        b.seats_booked,
        b.created_at    AS booking_date,

        -- Trajet
        t.id            AS trip_id,
        t.origin_city,
        t.destination_city,
        t.departure_at,
        t.price_per_seat,

        -- Conducteur
        drv.id          AS driver_id,
        drv.first_name  AS driver_first,
        drv.last_name   AS driver_last,
        drv.avatar_color AS driver_color,

        -- Passager
        pax.id          AS pax_id,
        pax.first_name  AS pax_first,
        pax.last_name   AS pax_last,
        pax.avatar_color AS pax_color,

        -- Dernier message
        last_msg.content    AS last_content,
        last_msg.created_at AS last_at,
        last_msg.sender_id  AS last_sender,

        -- Nb messages non lus
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.booking_id = b.id
            AND m.is_read = false
            AND m.sender_id != $1
        ) AS unread_count

      FROM bookings b
      JOIN trips t    ON t.id = b.trip_id
      JOIN users drv  ON drv.id = t.driver_id
      JOIN users pax  ON pax.id = b.passenger_id

      -- Dernier message de la conversation
      LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM messages
        WHERE booking_id = b.id
        ORDER BY created_at DESC
        LIMIT 1
      ) last_msg ON true

      -- L'utilisateur est conducteur OU passager
      WHERE (t.driver_id = $1 OR b.passenger_id = $1)
        AND b.status != 'cancelled'

      ORDER BY COALESCE(last_msg.created_at, b.created_at) DESC
    `, [userId])

    const conversations = result.rows.map(row => {
      // Déterminer l'interlocuteur (l'autre personne)
      const iAmDriver = row.driver_id === userId
      const otherId    = iAmDriver ? row.pax_id    : row.driver_id
      const otherFirst = iAmDriver ? row.pax_first : row.driver_first
      const otherLast  = iAmDriver ? row.pax_last  : row.driver_last
      const otherColor = iAmDriver ? row.pax_color : row.driver_color
      const myRole     = iAmDriver ? 'driver'      : 'passenger'

      return {
        bookingId:    row.booking_id,
        bookingStatus: row.booking_status,
        tripId:       row.trip_id,
        from:         row.origin_city,
        to:           row.destination_city,
        departureAt:  row.departure_at,
        price:        parseFloat(row.price_per_seat),
        myRole,
        other: {
          id:     otherId,
          name:   `${otherFirst} ${otherLast}`,
          avatar: otherFirst[0].toUpperCase(),
          color:  otherColor || '#1A9E8A',
        },
        lastMessage: row.last_content ? {
          content:  row.last_content,
          at:       row.last_at,
          isFromMe: row.last_sender === userId,
        } : null,
        unreadCount: parseInt(row.unread_count) || 0,
      }
    })

    res.json({ success: true, conversations })
  } catch (err) {
    console.error('GET /messages:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/messages/:bookingId
//  Récupère tous les messages d'une conversation
// ══════════════════════════════════════════════
router.get('/:bookingId', async (req, res) => {
  try {
    const userId    = req.session.userId
    const { bookingId } = req.params

    // Vérifier que l'utilisateur est bien conducteur ou passager
    const booking = await queryOne(`
      SELECT b.*, t.driver_id, t.origin_city, t.destination_city, t.departure_at,
             pax.first_name AS pax_first, pax.last_name AS pax_last, pax.avatar_color AS pax_color,
             drv.first_name AS drv_first, drv.last_name AS drv_last, drv.avatar_color AS drv_color
      FROM bookings b
      JOIN trips t ON t.id = b.trip_id
      JOIN users pax ON pax.id = b.passenger_id
      JOIN users drv ON drv.id = t.driver_id
      WHERE b.id = $1
    `, [bookingId])

    if (!booking) return res.status(404).json({ success: false, message: 'Conversation introuvable.' })
    if (booking.driver_id !== userId && booking.passenger_id !== userId) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' })
    }

    // Récupérer les messages
    const msgs = await query(`
      SELECT m.*, u.first_name, u.last_name, u.avatar_color
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.booking_id = $1
      ORDER BY m.created_at ASC
    `, [bookingId])

    // Marquer comme lus les messages de l'interlocuteur
    await query(`
      UPDATE messages
      SET is_read = true
      WHERE booking_id = $1 AND sender_id != $2 AND is_read = false
    `, [bookingId, userId])

    const iAmDriver  = booking.driver_id === userId
    const other = {
      id:     iAmDriver ? booking.passenger_id : booking.driver_id,
      name:   iAmDriver ? `${booking.pax_first} ${booking.pax_last}` : `${booking.drv_first} ${booking.drv_last}`,
      avatar: iAmDriver ? booking.pax_first[0].toUpperCase() : booking.drv_first[0].toUpperCase(),
      color:  iAmDriver ? booking.pax_color : booking.drv_color,
    }

    res.json({
      success: true,
      conversation: {
        bookingId,
        bookingStatus: booking.status,
        from:         booking.origin_city,
        to:           booking.destination_city,
        departureAt:  booking.departure_at,
        myRole:       iAmDriver ? 'driver' : 'passenger',
        other,
      },
      messages: msgs.rows.map(m => ({
        id:       m.id,
        content:  m.content,
        isFromMe: m.sender_id === userId,
        senderName: m.first_name,
        avatar:   m.first_name[0].toUpperCase(),
        color:    m.avatar_color,
        isRead:   m.is_read,
        at:       m.created_at,
      })),
    })
  } catch (err) {
    console.error('GET /messages/:id:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  POST /api/messages/:bookingId
//  Envoyer un message dans une conversation
// ══════════════════════════════════════════════
router.post('/:bookingId',
  [body('content').trim().notEmpty().isLength({ max: 1000 })],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Message invalide.' })

      const userId     = req.session.userId
      const { bookingId } = req.params
      const { content }   = req.body

      // Vérifier accès
      const booking = await queryOne(`
        SELECT b.passenger_id, t.driver_id
        FROM bookings b JOIN trips t ON t.id = b.trip_id
        WHERE b.id = $1
      `, [bookingId])

      if (!booking) return res.status(404).json({ success: false, message: 'Conversation introuvable.' })
      if (booking.driver_id !== userId && booking.passenger_id !== userId) {
        return res.status(403).json({ success: false, message: 'Accès refusé.' })
      }

      // Insérer le message
      const msg = await queryOne(`
        INSERT INTO messages (booking_id, sender_id, content)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [bookingId, userId, content])

      // Récupérer les infos de l'expéditeur
      const sender = await queryOne(
        'SELECT first_name, avatar_color FROM users WHERE id = $1',
        [userId]
      )

      // ── Email au destinataire ──────────────────
      // Seulement si l'autre personne n'a pas de messages non lus récents
      // (évite le spam si déjà en pleine conversation)
      try {
        const recipientId = booking.driver_id === userId
          ? booking.passenger_id
          : booking.driver_id

        // Vérifier le dernier email envoyé (pas plus d'1 email/heure par conversation)
        const recentUnread = await queryOne(`
          SELECT COUNT(*) AS cnt FROM messages
          WHERE booking_id = $1
            AND sender_id  = $2
            AND is_read    = false
            AND created_at > NOW() - INTERVAL '1 hour'
        `, [bookingId, userId])

        if (parseInt(recentUnread?.cnt || 0) <= 1) {
          const [recipient, tripInfo] = await Promise.all([
            queryOne('SELECT email, first_name FROM users WHERE id = $1', [recipientId]),
            queryOne(`
              SELECT t.origin_city, t.destination_city
              FROM bookings b JOIN trips t ON t.id = b.trip_id
              WHERE b.id = $1
            `, [bookingId]),
          ])
          if (recipient && tripInfo) {
            sendNewMessageEmail({
              recipientEmail: recipient.email,
              recipientName:  recipient.first_name,
              senderName:     sender.first_name,
              messagePreview: content.length > 100 ? content.slice(0, 100) + '…' : content,
              from:           tripInfo.origin_city,
              to:             tripInfo.destination_city,
              bookingId,
            }).catch(console.error)
          }
        }
      } catch (emailErr) {
        console.error('Email error (non-blocking):', emailErr)
      }

      res.status(201).json({
        success: true,
        message: {
          id:       msg.id,
          content:  msg.content,
          isFromMe: true,
          senderName: sender.first_name,
          avatar:   sender.first_name[0].toUpperCase(),
          color:    sender.avatar_color,
          isRead:   false,
          at:       msg.created_at,
        },
      })
    } catch (err) {
      console.error('POST /messages/:id:', err)
      res.status(500).json({ success: false, message: 'Erreur serveur.' })
    }
  }
)

// ══════════════════════════════════════════════
//  GET /api/messages/unread/count
//  Nombre total de messages non lus (pour le badge navbar)
// ══════════════════════════════════════════════
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.session.userId
    const result = await queryOne(`
      SELECT COUNT(*) AS total
      FROM messages m
      JOIN bookings b ON b.id = m.booking_id
      JOIN trips t    ON t.id = b.trip_id
      WHERE m.is_read = false
        AND m.sender_id != $1
        AND (t.driver_id = $1 OR b.passenger_id = $1)
    `, [userId])

    res.json({ success: true, count: parseInt(result.total) || 0 })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

module.exports = router
