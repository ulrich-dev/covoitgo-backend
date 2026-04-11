require('dotenv').config()

const express        = require('express')
const http           = require('http')
const fs             = require('fs')
const session        = require('express-session')
const pgSession      = require('connect-pg-simple')(session)
const cors           = require('cors')
const path           = require('path')
const passport       = require('./config/passport')
const { pool }       = require('./db')
const { waitForDatabase } = require('./db')
const { initSocket } = require('./socket')

// ── Migrations automatiques au démarrage ─────────────────────
async function runMigrations() {
  const files = [
    'schema.sql',
    'migration_auth.sql',
    'migration_oauth.sql',
    'migration_admin.sql',
    'migration_vehicle.sql',
    'migration_scheduler.sql',
    'migration_confirmation.sql',
    'migration_contact.sql',
    'migration_connection_logs.sql',
    'migration_freemium.sql',
    'migration_inquiry.sql',
    'migration_avatar.sql',
    'migration_language.sql',
    'migration_alerts.sql',
  ]
  console.log('\n  🗄️  Vérification des migrations...')
  for (const file of files) {
    const filePath = path.join(__dirname, 'db', file)
    if (!fs.existsSync(filePath)) continue
    try {
      const sql = fs.readFileSync(filePath, 'utf8')
      await pool.query(sql)
      console.log(`  ✅  ${file}`)
    } catch (err) {
      if (!err.message.includes('already exists') &&
          !err.message.includes('duplicate') &&
          !err.message.includes('does not exist')) {
        console.error(`  ⚠️  ${file}: ${err.message}`)
      }
    }
  }
  console.log('  ✅  Migrations terminées\n')
}

const authRoutes          = require('./routes/auth')
const tripsRoutes         = require('./routes/trips')
const messagesRoutes      = require('./routes/messages')
const adminRoutes         = require('./routes/admin')
const notificationsRoutes = require('./routes/notifications')
const driverRoutes        = require('./routes/driver')
const reviewsRoutes       = require('./routes/reviews')
const confirmRoutes       = require('./routes/confirm')
const contactRoutes       = require('./routes/contact')
const freemiumRoutes      = require('./routes/freemium')
const { router: alertsRoutes } = require('./routes/alerts')
const { startScheduler }  = require('./scheduler')

const app    = express()
const server = http.createServer(app)   // ← HTTP server (requis par Socket.io)
const PORT   = process.env.PORT || 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── CORS ──────────────────────────────────────────────────────
// Le proxy Vite fait que les requêtes arrivent de localhost:5173.
// On accepte aussi les appels directs (Postman, tests, mobile sans proxy).
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (process.env.NODE_ENV === 'production') {
      // Accepter le domaine frontend configuré + sous-domaines Vercel/Netlify
      const allowed = [
        process.env.CLIENT_URL,
        process.env.CLIENT_URL_2, // ex: domaine personnalisé
      ].filter(Boolean)
      const isAllowed = allowed.some(u => origin === u || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app'))
      return callback(isAllowed ? null : new Error(`CORS bloqué : ${origin}`), isAllowed)
    }
    callback(null, true)
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Sessions ──────────────────────────────────────────────────
const SESSION_DURATION = 3 * 60 * 60 * 1000 // 3 heures en ms

app.use(session({
  store: new pgSession({
    pool,
    tableName:            'session',
    createTableIfMissing: true,       // crée la table si elle n'existe pas
    pruneSessionInterval: 60 * 60,    // nettoyer les sessions expirées toutes les heures
    ttl:                  3 * 60 * 60 // TTL en secondes (3h) dans PostgreSQL
  }),
  secret:            process.env.SESSION_SECRET || 'dev_secret_changez_en_prod',
  resave:            true,            // re-sauvegarder à chaque requête (renouvelle le TTL)
  saveUninitialized: false,
  rolling:           true,            // renouveler le cookie à chaque requête
  name: 'cvg.sid',
  cookie: {
    maxAge:   SESSION_DURATION,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}))

// ── Passport ─────────────────────────────────────────────────
app.use(passport.initialize())

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/trips',         tripsRoutes)
app.use('/api/messages',      messagesRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/driver',        driverRoutes)
app.use('/api/reviews',       reviewsRoutes)
app.use('/api/confirm',       confirmRoutes)
app.use('/api/contact',       contactRoutes)
app.use('/api/freemium',      freemiumRoutes)
app.use('/api/alerts',        alertsRoutes)

// ── Fichiers statiques — uploads (avatars, documents) ──────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    server:  'Covoitgo API',
    version: '1.3.0',
    env:     process.env.NODE_ENV || 'development',
    oauth: {
      google:   !!process.env.GOOGLE_CLIENT_ID,
      facebook: !!process.env.FACEBOOK_APP_ID,
    },
    time: new Date().toISOString(),
  })
})

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route inconnue : ${req.method} ${req.path}` })
)
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err)
  res.status(500).json({ success: false, message: 'Erreur serveur interne.' })
})

// ── Socket.io ─────────────────────────────────────────────────
// Doit être initialisé APRÈS la configuration de session
initSocket(server, session({
  store: new pgSession({
    pool,
    tableName:            'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60,
    ttl:                  3 * 60 * 60,
  }),
  secret:            process.env.SESSION_SECRET || 'dev_secret_changez_en_prod',
  resave:            true,
  saveUninitialized: false,
  rolling:           true,
  name: 'cvg.sid',
  cookie: {
    maxAge:   SESSION_DURATION,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}))

// ── Démarrage ─────────────────────────────────────────────────
async function start() {
  // 1. Attendre que PostgreSQL soit disponible
  const dbReady = await waitForDatabase(10, 3000)
  if (!dbReady) {
    console.error('❌ PostgreSQL inaccessible — arrêt.')
    process.exit(1)
  }

  // 2. Migrations
  await runMigrations()

  // 3. Démarrer le serveur
  server.listen(PORT, '0.0.0.0', () => {
    console.log('')
    console.log('  🚗  Covoitgo API v2.0')
    console.log(`  💻  Port     : ${PORT}`)
    console.log(`  🌍  Env      : ${process.env.NODE_ENV || 'development'}`)
    console.log(`  🔐  Google   : ${process.env.GOOGLE_CLIENT_ID  ? '✅' : '❌ manquant'}`)
    console.log(`  🔐  Facebook : ${process.env.FACEBOOK_APP_ID   ? '✅' : '❌ manquant'}`)
    console.log('')
    startScheduler()
  })
}

start().catch(err => {
  console.error('❌ Erreur démarrage:', err)
  process.exit(1)
})

module.exports = app
