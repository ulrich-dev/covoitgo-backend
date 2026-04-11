const { Pool } = require('pg')
require('dotenv').config()

// ── Configuration PostgreSQL Railway ─────────────────────────
let poolConfig

if (process.env.DATABASE_URL) {
  // Railway / Production — DATABASE_URL avec SSL obligatoire
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis:       30000,
    connectionTimeoutMillis: 30000,  // 30s pour Railway
    acquireTimeoutMillis:    30000,
  }
} else {
  // Développement local
  poolConfig = {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'covoitgo',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 10,
    idleTimeoutMillis:       30000,
    connectionTimeoutMillis: 10000,
  }
}

const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message)
})

// Test de connexion
pool.connect()
  .then(client => {
    client.release()
    console.log('✅  Connecté à PostgreSQL')
  })
  .catch(err => {
    console.error('❌  Erreur connexion PostgreSQL:', err.message)
    console.error('    DATABASE_URL:', process.env.DATABASE_URL ? '✅ définie' : '❌ manquante')
  })

const query    = (text, params) => pool.query(text, params)
const queryOne = async (text, params) => {
  const res = await pool.query(text, params)
  return res.rows[0] || null
}

module.exports = { pool, query, queryOne }
