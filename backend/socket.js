const { Server }  = require('socket.io')
const { query, queryOne } = require('./db')
const jwt = require('jsonwebtoken')

let io = null

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev_secret_changez_en_prod'

function initSocket(server, sessionMiddleware) {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        // Accepter toutes les origines vercel.app + CLIENT_URL
        if (!origin) return cb(null, true)
        const allowed = [
          process.env.CLIENT_URL,
          'http://localhost:5173',
          'http://localhost:3000',
        ].filter(Boolean)
        const ok = allowed.some(u => origin === u || origin.endsWith('.vercel.app'))
        cb(null, ok)
      },
      credentials: true,
    },
  })

  // Partager la session Express avec Socket.io
  io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next)
  })

  // Authentifier le socket — JWT ou session
  io.use((socket, next) => {
    // 1. Essayer le JWT depuis le handshake auth
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        socket.userId = decoded.userId
        return next()
      } catch {}
    }

    // 2. Fallback session
    const userId = socket.request.session?.userId
    if (userId) {
      socket.userId = userId
      return next()
    }

    next(new Error('Non authentifié'))
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connecté : userId=${socket.userId}`)

    // ── Rejoindre une salle de conversation ──────────────────
    // Le client envoie { bookingId } pour s'abonner aux messages
    socket.on('join_conversation', async ({ bookingId }) => {
      try {
        const booking = await queryOne(
          `SELECT b.passenger_id, t.driver_id
           FROM bookings b JOIN trips t ON t.id = b.trip_id
           WHERE b.id = $1`,
          [bookingId]
        )
        if (!booking) return
        // Vérifier que l'utilisateur est bien dans cette conversation
        if (booking.driver_id !== socket.userId && booking.passenger_id !== socket.userId) return

        socket.join(`booking:${bookingId}`)
        console.log(`  📨 ${socket.userId} a rejoint booking:${bookingId}`)
      } catch (err) {
        console.error('join_conversation:', err.message)
      }
    })

    // ── Quitter une salle ────────────────────────────────────
    socket.on('leave_conversation', ({ bookingId }) => {
      socket.leave(`booking:${bookingId}`)
    })

    // ── Envoyer un message ───────────────────────────────────
    socket.on('send_message', async ({ bookingId, content }) => {
      try {
        if (!content?.trim() || content.length > 1000) return

        // Vérifier accès
        const booking = await queryOne(
          `SELECT b.passenger_id, t.driver_id
           FROM bookings b JOIN trips t ON t.id = b.trip_id
           WHERE b.id = $1`,
          [bookingId]
        )
        if (!booking) return
        if (booking.driver_id !== socket.userId && booking.passenger_id !== socket.userId) return

        // Sauvegarder en base
        const msg = await queryOne(
          `INSERT INTO messages (booking_id, sender_id, content)
           VALUES ($1, $2, $3) RETURNING *`,
          [bookingId, socket.userId, content.trim()]
        )

        const sender = await queryOne(
          'SELECT first_name, avatar_color FROM users WHERE id = $1',
          [socket.userId]
        )

        const msgData = {
          id:         msg.id,
          content:    msg.content,
          bookingId,
          senderId:   socket.userId,
          senderName: sender.first_name,
          avatar:     sender.first_name[0].toUpperCase(),
          color:      sender.avatar_color,
          isRead:     false,
          at:         msg.created_at,
        }

        // Diffuser à tous les membres de la salle (sauf l'émetteur)
        socket.to(`booking:${bookingId}`).emit('new_message', msgData)
        // Confirmer à l'émetteur
        socket.emit('message_sent', { ...msgData, isFromMe: true })

        // Notif email en arrière-plan (rate-limitée)
        sendEmailNotif(bookingId, socket.userId, content.trim(), sender.first_name)
          .catch(() => {})

      } catch (err) {
        console.error('send_message:', err.message)
        socket.emit('message_error', { error: 'Erreur lors de l\'envoi.' })
      }
    })

    // ── Indicateur "est en train d'écrire" ───────────────────
    socket.on('typing', ({ bookingId, isTyping }) => {
      socket.to(`booking:${bookingId}`).emit('typing', {
        userId: socket.userId,
        isTyping,
      })
    })

    // ── Marquer messages comme lus ───────────────────────────
    socket.on('mark_read', async ({ bookingId }) => {
      try {
        await query(
          `UPDATE messages
           SET is_read = true
           WHERE booking_id = $1 AND sender_id != $2 AND is_read = false`,
          [bookingId, socket.userId]
        )
        // Notifier l'autre que ses messages ont été lus
        socket.to(`booking:${bookingId}`).emit('messages_read', {
          bookingId,
          readBy: socket.userId,
        })
      } catch (err) {
        console.error('mark_read:', err.message)
      }
    })

    socket.on('disconnect', () => {
      console.log(`🔌 Socket déconnecté : userId=${socket.userId}`)
    })
  })

  return io
}

// Email rate-limité (1 email/heure par conversation)
async function sendEmailNotif(bookingId, senderId, content, senderName) {
  const { sendNewMessageEmail } = require('./utils/email')

  const recentUnread = await queryOne(
    `SELECT COUNT(*) AS cnt FROM messages
     WHERE booking_id = $1 AND sender_id = $2 AND is_read = false
       AND created_at > NOW() - INTERVAL '1 hour'`,
    [bookingId, senderId]
  )
  if (parseInt(recentUnread?.cnt || 0) > 1) return

  const booking = await queryOne(
    `SELECT b.passenger_id, t.driver_id, t.origin_city, t.destination_city
     FROM bookings b JOIN trips t ON t.id = b.trip_id WHERE b.id = $1`,
    [bookingId]
  )
  if (!booking) return

  const recipientId = booking.driver_id === senderId
    ? booking.passenger_id
    : booking.driver_id

  const recipient = await queryOne(
    'SELECT email, first_name FROM users WHERE id = $1',
    [recipientId]
  )
  if (!recipient) return

  await sendNewMessageEmail({
    recipientEmail: recipient.email,
    recipientName:  recipient.first_name,
    senderName,
    messagePreview: content.length > 100 ? content.slice(0, 100) + '…' : content,
    from:           booking.origin_city,
    to:             booking.destination_city,
    bookingId,
  })
}

function getIO() { return io }

module.exports = { initSocket, getIO }
