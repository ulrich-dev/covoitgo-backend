const { Pool } = require('pg')
require('dotenv').config()

// ── Configuration du pool PostgreSQL ─────────────────────────
// En production (Railway) : utilise DATABASE_URL avec SSL
// En développement        : utilise les variables séparées
const isProduction = process.env.NODE_ENV === 'production'

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction
        ? { rejectUnauthorized: false }   // Railway exige SSL
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'covoitgo',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }

const pool = new Pool(poolConfig)

// Test de connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Erreur connexion PostgreSQL:', err.message)
    console.error('    DATABASE_URL:', process.env.DATABASE_URL ? '✅ définie' : '❌ manquante')
    return
  }
  release()
  console.log('✅  Connecté à PostgreSQL')
})

const query    = (text, params) => pool.query(text, params)
const queryOne = async (text, params) => {
  const res = await pool.query(text, params)
  return res.rows[0] || null
}

module.exports = { pool, query, queryOne }
