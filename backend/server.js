require('dotenv').config()

const express        = require('express')
const http           = require('http')
const session        = require('express-session')
const pgSession      = require('connect-pg-simple')(session)
const cors           = require('cors')
const path           = require('path')
const passport       = require('./config/passport')
const { pool }       = require('./db')
const { initSocket } = require('./socket')

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
app.use(session({
  store: new pgSession({
    pool,
    tableName:            'session',
    createTableIfMissing: false,
    pruneSessionInterval: 3600,
  }),
  secret:            process.env.SESSION_SECRET || 'dev_secret_changez_en_prod',
  resave:            false,
  saveUninitialized: false,
  name: 'cvg.sid',
  cookie: {
    maxAge:   7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',  // HTTPS obligatoire en prod
    // 'none' requis pour les cookies cross-domain (frontend vercel ↔ backend railway)
    // 'lax' suffisant en dev (même origine via proxy Vite)
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
    createTableIfMissing: false,
    pruneSessionInterval: 3600,
  }),
  secret:            process.env.SESSION_SECRET || 'dev_secret_changez_en_prod',
  resave:            false,
  saveUninitialized: false,
  name: 'cvg.sid',
  cookie: {
    maxAge:   7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}))

// ── Démarrage ─────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  let lanIP = 'N/A'
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name]) {
      if (iface.family === 'IPv4' && !iface.internal) lanIP = iface.address
    }
  }

  console.log('')
  console.log('  🚗  Covoitgo API v2.0 — WebSocket activé')
  console.log(`  💻  Backend  : http://localhost:${PORT}`)
  console.log(`  📱  Frontend : http://${lanIP}:5173`)
  console.log(`  🔌  Socket.io: ws://localhost:${PORT}`)
  console.log(`  🔐  Google   : ${process.env.GOOGLE_CLIENT_ID  ? '✅ configuré' : '❌ manquant'}`)
  console.log(`  🔐  Facebook : ${process.env.FACEBOOK_APP_ID  ? '✅ configuré' : '❌ manquant'}`)
  console.log('')
  startScheduler()
})

module.exports = app
