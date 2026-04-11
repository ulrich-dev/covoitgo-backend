const express    = require('express')
const { query, queryOne } = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { sendAccountBlockedEmail, sendAccountReactivatedEmail } = require('../utils/email')

const router = express.Router()

// ── /me doit être AVANT requireAdmin (pour vérifier si on est admin) ──
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, email, first_name, last_name, is_admin FROM users WHERE id = $1',
      [req.session.userId]
    )
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// Toutes les autres routes admin nécessitent d'être admin
router.use(requireAuth, requireAdmin)

// ══════════════════════════════════════════════
//  GET /api/admin/stats — Dashboard chiffres clés
// ══════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const [users, trips, bookings, messages, revenue, newUsers, newTrips] = await Promise.all([

      queryOne(`SELECT
        COUNT(*)                                     AS total,
        COUNT(*) FILTER (WHERE is_active = true)     AS active,
        COUNT(*) FILTER (WHERE is_admin  = true)     AS admins,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_week
        FROM users`),

      queryOne(`SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE status = 'active')        AS active,
        COUNT(*) FILTER (WHERE status = 'completed')     AS completed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_week
        FROM trips`),

      queryOne(`SELECT
        COUNT(*)                                           AS total,
        COUNT(*) FILTER (WHERE status = 'pending')        AS pending,
        COUNT(*) FILTER (WHERE status = 'confirmed')      AS confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled')      AS cancelled,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_week
        FROM bookings`),

      queryOne(`SELECT COUNT(*) AS total FROM messages`),

      queryOne(`SELECT
        COALESCE(SUM(b.seats_booked * t.price_per_seat), 0) AS total_revenue,
        COALESCE(SUM(b.seats_booked * t.price_per_seat) FILTER (
          WHERE b.created_at > NOW() - INTERVAL '30 days'), 0) AS month_revenue
        FROM bookings b
        JOIN trips t ON t.id = b.trip_id
        WHERE b.status IN ('confirmed','completed')`),

      // Inscription par jour (7 derniers jours)
      query(`SELECT DATE(created_at) AS day, COUNT(*) AS count
             FROM users WHERE created_at > NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY day`),

      // Trajets par jour (7 derniers jours)
      query(`SELECT DATE(created_at) AS day, COUNT(*) AS count
             FROM trips WHERE created_at > NOW() - INTERVAL '7 days'
             GROUP BY DATE(created_at) ORDER BY day`),
    ])

    // ── Stats de connexion ─────────────────────────────────────
    const [connTotal, connMethod, connDaily30, connPeak] = await Promise.all([

      // Total connexions + utilisateurs uniques
      queryOne(`SELECT
        COUNT(*)                        AS total_logins,
        COUNT(DISTINCT user_id)         AS unique_users,
        COUNT(*) FILTER (WHERE logged_at > NOW() - INTERVAL '24 hours') AS logins_24h,
        COUNT(*) FILTER (WHERE logged_at > NOW() - INTERVAL '7 days')   AS logins_7d,
        COUNT(DISTINCT user_id) FILTER (WHERE logged_at > NOW() - INTERVAL '24 hours') AS active_24h,
        COUNT(DISTINCT user_id) FILTER (WHERE logged_at > NOW() - INTERVAL '7 days')   AS active_7d
        FROM connection_logs`),

      // Répartition par méthode
      query(`SELECT method, COUNT(*) AS count
             FROM connection_logs
             GROUP BY method ORDER BY count DESC`),

      // Connexions par jour sur 30 jours (DAU + total)
      query(`SELECT
               DATE(logged_at)             AS day,
               COUNT(*)                    AS total_logins,
               COUNT(DISTINCT user_id)     AS unique_users
             FROM connection_logs
             WHERE logged_at > NOW() - INTERVAL '30 days'
             GROUP BY DATE(logged_at)
             ORDER BY day`),

      // Heure de pointe (quelle heure du jour a le plus de connexions)
      query(`SELECT
               EXTRACT(HOUR FROM logged_at)::int AS hour,
               COUNT(*) AS count
             FROM connection_logs
             WHERE logged_at > NOW() - INTERVAL '30 days'
             GROUP BY hour
             ORDER BY hour`),
    ])

    // Top villes
    const topRoutes = await query(`
      SELECT origin_city AS "from", destination_city AS "to", COUNT(*) AS count
      FROM trips GROUP BY origin_city, destination_city
      ORDER BY count DESC LIMIT 5`)

    res.json({
      success: true,
      stats: {
        users:    users,
        trips:    trips,
        bookings: bookings,
        messages: messages,
        revenue:  revenue,
        charts: {
          newUsers: newUsers.rows,
          newTrips: newTrips.rows,
        },
        topRoutes: topRoutes.rows,
        connections: {
          total:       parseInt(connTotal.total_logins)  || 0,
          uniqueUsers: parseInt(connTotal.unique_users)  || 0,
          last24h:     parseInt(connTotal.logins_24h)    || 0,
          last7d:      parseInt(connTotal.logins_7d)     || 0,
          active24h:   parseInt(connTotal.active_24h)   || 0,
          active7d:    parseInt(connTotal.active_7d)    || 0,
          byMethod:    connMethod.rows,
          daily30:     connDaily30.rows,
          byHour:      connPeak.rows,
        },
      },
    })
  } catch (err) {
    console.error('GET /admin/stats:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/admin/users — Liste utilisateurs
// ══════════════════════════════════════════════
router.get('/users', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20, status } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let conditions = []
    let params     = []
    let n          = 1

    if (search) {
      conditions.push(`(LOWER(first_name || ' ' || last_name) LIKE $${n} OR LOWER(email) LIKE $${n})`)
      params.push(`%${search.toLowerCase()}%`); n++
    }
    if (status === 'active')   { conditions.push(`is_active = true`); }
    if (status === 'inactive') { conditions.push(`is_active = false`); }
    if (status === 'admin')    { conditions.push(`is_admin = true`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, total] = await Promise.all([
      query(`
        SELECT id, email, first_name, last_name, phone, role, avatar_color,
               is_active, is_admin, email_verified, avg_rating, review_count,
               created_at, updated_at,
               car_brand, car_model, car_color, car_year,
               license_doc, identity_doc, docs_status,
               (SELECT COUNT(*) FROM trips WHERE driver_id = users.id)    AS trips_count,
               (SELECT COUNT(*) FROM bookings WHERE passenger_id = users.id) AS bookings_count
        FROM users ${where}
        ORDER BY created_at DESC
        LIMIT $${n} OFFSET $${n+1}
      `, [...params, parseInt(limit), offset]),

      queryOne(`SELECT COUNT(*) AS total FROM users ${where}`, params),
    ])

    res.json({
      success: true,
      users:   rows.rows,
      total:   parseInt(total.total),
      page:    parseInt(page),
      pages:   Math.ceil(parseInt(total.total) / parseInt(limit)),
    })
  } catch (err) {
    console.error('GET /admin/users:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  PATCH /api/admin/users/:id — Modifier un user
// ══════════════════════════════════════════════
router.patch('/users/:id', async (req, res) => {
  try {
    const { is_active, is_admin, role } = req.body
    const { id } = req.params

    const sets   = []
    const params = []
    let n        = 1

    if (is_active !== undefined) { sets.push(`is_active = $${n}`);  params.push(is_active);  n++ }
    if (is_admin  !== undefined) { sets.push(`is_admin  = $${n}`);  params.push(is_admin);   n++ }
    if (role      !== undefined) { sets.push(`role      = $${n}`);  params.push(role);       n++ }

    if (!sets.length) return res.status(400).json({ success: false, message: 'Rien à modifier.' })

    sets.push(`updated_at = NOW()`)
    params.push(id)

    const user = await queryOne(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${n} RETURNING id, email, first_name, last_name, is_active, is_admin, role`,
      params
    )
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' })

    // ── Email si compte bloqué ou réactivé ────
    if (is_active === false) {
      sendAccountBlockedEmail({ email: user.email, firstName: user.first_name }).catch(console.error)
    } else if (is_active === true) {
      sendAccountReactivatedEmail({ email: user.email, firstName: user.first_name }).catch(console.error)
    }

    res.json({ success: true, user })
  } catch (err) {
    console.error('PATCH /admin/users/:id:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  DELETE /api/admin/users/:id — Supprimer
// ══════════════════════════════════════════════
router.delete('/users/:id', async (req, res) => {
  try {
    const admin = await queryOne('SELECT id FROM users WHERE id = $1 AND is_admin = true', [req.params.id])
    if (admin) return res.status(400).json({ success: false, message: 'Impossible de supprimer un administrateur.' })

    await query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /admin/users/:id:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/admin/trips — Liste trajets
// ══════════════════════════════════════════════
router.get('/trips', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20, status } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let conditions = []
    let params     = []
    let n          = 1

    if (search) {
      conditions.push(`(LOWER(t.origin_city) LIKE $${n} OR LOWER(t.destination_city) LIKE $${n} OR LOWER(u.first_name || ' ' || u.last_name) LIKE $${n})`)
      params.push(`%${search.toLowerCase()}%`); n++
    }
    if (status) { conditions.push(`t.status = $${n}`); params.push(status); n++ }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, total] = await Promise.all([
      query(`
        SELECT t.id, t.origin_city, t.destination_city, t.departure_at,
               t.price_per_seat, t.available_seats, t.status, t.created_at,
               u.id AS driver_id, u.first_name AS driver_first, u.last_name AS driver_last, u.email AS driver_email,
               (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id AND b.status != 'cancelled') AS bookings_count
        FROM trips t JOIN users u ON u.id = t.driver_id
        ${where} ORDER BY t.created_at DESC
        LIMIT $${n} OFFSET $${n+1}
      `, [...params, parseInt(limit), offset]),

      queryOne(`SELECT COUNT(*) AS total FROM trips t JOIN users u ON u.id = t.driver_id ${where}`, params),
    ])

    res.json({
      success: true,
      trips:   rows.rows,
      total:   parseInt(total.total),
      page:    parseInt(page),
      pages:   Math.ceil(parseInt(total.total) / parseInt(limit)),
    })
  } catch (err) {
    console.error('GET /admin/trips:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  PATCH /api/admin/trips/:id/status
// ══════════════════════════════════════════════
router.patch('/trips/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    const valid = ['active', 'cancelled', 'completed', 'full']
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide.' })

    const trip = await queryOne(
      `UPDATE trips SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]
    )
    if (!trip) return res.status(404).json({ success: false, message: 'Trajet introuvable.' })
    res.json({ success: true, trip })
  } catch (err) {
    console.error('PATCH /admin/trips/:id/status:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  DELETE /api/admin/trips/:id
// ══════════════════════════════════════════════
router.delete('/trips/:id', async (req, res) => {
  try {
    await query('DELETE FROM trips WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /admin/trips/:id:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/admin/bookings — Liste réservations
// ══════════════════════════════════════════════
router.get('/bookings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let conditions = []
    let params     = []
    let n          = 1

    if (status) { conditions.push(`b.status = $${n}`); params.push(status); n++ }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, total] = await Promise.all([
      query(`
        SELECT b.id, b.status, b.seats_booked, b.created_at,
               t.origin_city, t.destination_city, t.departure_at, t.price_per_seat,
               drv.first_name AS driver_first, drv.last_name AS driver_last,
               pax.first_name AS pax_first,    pax.last_name AS pax_last
        FROM bookings b
        JOIN trips t    ON t.id = b.trip_id
        JOIN users drv  ON drv.id = t.driver_id
        JOIN users pax  ON pax.id = b.passenger_id
        ${where} ORDER BY b.created_at DESC
        LIMIT $${n} OFFSET $${n+1}
      `, [...params, parseInt(limit), offset]),

      queryOne(`SELECT COUNT(*) AS total FROM bookings b JOIN trips t ON t.id = b.trip_id ${where}`, params),
    ])

    res.json({
      success:  true,
      bookings: rows.rows,
      total:    parseInt(total.total),
      page:     parseInt(page),
      pages:    Math.ceil(parseInt(total.total) / parseInt(limit)),
    })
  } catch (err) {
    console.error('GET /admin/bookings:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

// ══════════════════════════════════════════════
//  GET /api/admin/me — Vérifie que l'admin est connecté
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════
//  PATCH /api/admin/users/:id/docs
//  Vérifier ou rejeter les documents d'un conducteur
// ══════════════════════════════════════════════
router.patch('/users/:id/docs', async (req, res) => {
  try {
    const { docs_status } = req.body
    if (!['verified', 'rejected', 'pending'].includes(docs_status))
      return res.status(400).json({ success: false, message: 'Statut invalide.' })

    const user = await queryOne(
      `UPDATE users SET docs_status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, email, first_name, docs_status`,
      [docs_status, req.params.id]
    )
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' })
    res.json({ success: true, user })
  } catch (err) {
    console.error('PATCH /admin/users/:id/docs:', err)
    res.status(500).json({ success: false, message: 'Erreur serveur.' })
  }
})

module.exports = router
