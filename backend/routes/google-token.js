// ══════════════════════════════════════════════════════════════
//  POST /api/auth/google-token
//  Vérifie un idToken Google (depuis l'app Android native)
//  et retourne un JWT Clando
// ══════════════════════════════════════════════════════════════

const express   = require('express')
const { OAuth2Client } = require('google-auth-library')
const jwt       = require('jsonwebtoken')
const { queryOne, query } = require('../db')

const router    = express.Router()
const COLORS    = ['#1A9E8A','#FF6B35','#7C3AED','#0EA5E9','#F59E0B']
const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]

// Accepter les deux Client IDs (web + Android)
const GOOGLE_CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
].filter(Boolean)

router.post('/', async (req, res) => {
  try {
    const { idToken } = req.body
    if (!idToken) {
      return res.status(400).json({ success:false, message:'idToken manquant' })
    }

    // Vérifier le token Google
    let payload
    let verifyError = null

    for (const clientId of GOOGLE_CLIENT_IDS) {
      try {
        const client  = new OAuth2Client(clientId)
        const ticket  = await client.verifyIdToken({ idToken, audience: clientId })
        payload       = ticket.getPayload()
        if (payload) break
      } catch (e) {
        verifyError = e
      }
    }

    // Si aucun clientId configuré, essayer sans audience (dev)
    if (!payload && GOOGLE_CLIENT_IDS.length === 0) {
      try {
        const client  = new OAuth2Client()
        const ticket  = await client.verifyIdToken({ idToken })
        payload       = ticket.getPayload()
      } catch (e) {
        verifyError = e
      }
    }

    if (!payload) {
      console.error('Google token verify error:', verifyError?.message)
      return res.status(401).json({ success:false, message:'Token Google invalide' })
    }

    const { sub: googleId, email, given_name, family_name, picture } = payload

    // Trouver ou créer l'utilisateur
    let user = await queryOne('SELECT * FROM users WHERE google_id = $1', [googleId])

    if (!user && email) {
      user = await queryOne('SELECT * FROM users WHERE email = $1', [email])
      if (user) {
        // Lier le compte Google au compte existant
        await query(
          'UPDATE users SET google_id=$1, avatar_url=COALESCE(avatar_url,$2), email_verified=true WHERE id=$3',
          [googleId, picture, user.id]
        )
        user = await queryOne('SELECT * FROM users WHERE id=$1', [user.id])
      }
    }

    if (!user) {
      // Nouveau compte
      user = await queryOne(
        `INSERT INTO users
           (email, first_name, last_name, role, avatar_color, avatar_url,
            email_verified, oauth_provider, google_id)
         VALUES ($1,$2,$3,'both',$4,$5,true,'google',$6)
         RETURNING *`,
        [
          email || `google_${googleId}@clando.app`,
          given_name  || 'Utilisateur',
          family_name || '',
          randColor(),
          picture     || null,
          googleId,
        ]
      )
    }

    if (!user) {
      return res.status(500).json({ success:false, message:'Erreur création compte' })
    }

    // Générer un JWT Clando
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev_secret',
      { expiresIn: '30d' }
    )

    // Réponse
    res.json({
      success: true,
      token,
      user: {
        id:          user.id,
        email:       user.email,
        firstName:   user.first_name,
        lastName:    user.last_name,
        avatarUrl:   user.avatar_url,
        avatarColor: user.avatar_color,
        role:        user.role,
      },
    })
  } catch (err) {
    console.error('google-token error:', err)
    res.status(500).json({ success:false, message:'Erreur serveur' })
  }
})

module.exports = router
