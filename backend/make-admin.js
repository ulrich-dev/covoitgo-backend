/**
 * Script pour promouvoir un utilisateur en administrateur
 *
 * Usage :
 *   node make-admin.js votre@email.com
 */

require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'covoitgo',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
})

async function makeAdmin(email) {
  if (!email) {
    console.error('❌  Usage : node make-admin.js votre@email.com')
    process.exit(1)
  }

  try {
    // D'abord appliquer la migration si la colonne n'existe pas
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false
    `)

    const result = await pool.query(
      `UPDATE users SET is_admin = true WHERE email = $1 RETURNING id, email, first_name, last_name`,
      [email]
    )

    if (result.rowCount === 0) {
      console.error(`❌  Aucun utilisateur trouvé avec l'email : ${email}`)
      console.error('    Vérifiez que l\'utilisateur s\'est bien inscrit.')
      process.exit(1)
    }

    const u = result.rows[0]
    console.log('')
    console.log('  ✅  Administrateur créé avec succès !')
    console.log(`  👤  ${u.first_name} ${u.last_name}`)
    console.log(`  📧  ${u.email}`)
    console.log(`  🆔  ${u.id}`)
    console.log('')
    console.log('  → Connectez-vous et accédez à /admin')
    console.log('')

  } catch (err) {
    console.error('❌  Erreur :', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

makeAdmin(process.argv[2])
