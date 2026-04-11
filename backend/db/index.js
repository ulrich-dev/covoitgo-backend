const { Pool } = require('pg')
require('dotenv').config()

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis:       30000,
      connectionTimeoutMillis: 30000,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'clando',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 10,
      idleTimeoutMillis:       30000,
      connectionTimeoutMillis: 10000,
    }

const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message)
})

// ── Attendre que PostgreSQL soit prêt (retry automatique) ─────
async function waitForDatabase(maxRetries = 10, delayMs = 3000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const client = await pool.connect()
      client.release()
      console.log('✅  Connecté à PostgreSQL')
      return true
    } catch (err) {
      console.log(`⏳  PostgreSQL pas encore prêt (tentative ${i}/${maxRetries}) — ${err.message}`)
      if (i === maxRetries) {
        console.error('❌  Impossible de se connecter à PostgreSQL après', maxRetries, 'tentatives')
        return false
      }
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

const query    = (text, params) => pool.query(text, params)
const queryOne = async (text, params) => {
  const res = await pool.query(text, params)
  return res.rows[0] || null
}

module.exports = { pool, query, queryOne, waitForDatabase }
