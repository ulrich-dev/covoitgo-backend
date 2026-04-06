const { Pool } = require('pg')
require('dotenv').config()

// Pool de connexions PostgreSQL
// Le pool gère automatiquement les connexions simultanées
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'covoitgo',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Nombre max de connexions simultanées
  max: 20,
  // Délai avant fermeture d'une connexion inactive (ms)
  idleTimeoutMillis: 30000,
  // Délai max pour obtenir une connexion (ms)
  connectionTimeoutMillis: 2000,
})

// Test de connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Erreur connexion PostgreSQL:', err.message)
    console.error('    Vérifiez votre fichier .env et que PostgreSQL tourne bien.')
    return
  }
  release()
  console.log('✅  Connecté à PostgreSQL — base:', process.env.DB_NAME)
})

// Helper — exécute une requête et retourne les lignes
const query = (text, params) => pool.query(text, params)

// Helper — récupère une seule ligne
const queryOne = async (text, params) => {
  const res = await pool.query(text, params)
  return res.rows[0] || null
}

module.exports = { pool, query, queryOne }
