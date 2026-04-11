const passport         = require('passport')
const GoogleStrategy   = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const { queryOne, query } = require('../db')

const COLORS      = ['#1A9E8A','#FF6B35','#7C3AED','#0EA5E9','#F59E0B']
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)]

passport.serializeUser((user, done)  => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1 AND is_active = true', [id])
    done(null, user || false)
  } catch (err) { done(err, false) }
})

// ── Créer ou retrouver un utilisateur OAuth ──────────────────
async function findOrCreateOAuthUser({ provider, providerId, email, firstName, lastName, avatarUrl }) {
  const col  = provider === 'google' ? 'google_id' : 'facebook_id'
  let user   = await queryOne(`SELECT * FROM users WHERE ${col} = $1`, [providerId])
  if (user) return user

  if (email) {
    user = await queryOne('SELECT * FROM users WHERE email = $1', [email])
    if (user) {
      await query(
        `UPDATE users SET ${col} = $1, oauth_provider = $2,
         avatar_url = COALESCE(avatar_url, $3), email_verified = true WHERE id = $4`,
        [providerId, provider, avatarUrl, user.id]
      )
      return queryOne('SELECT * FROM users WHERE id = $1', [user.id])
    }
  }

  return queryOne(
    `INSERT INTO users
       (email, first_name, last_name, role, avatar_color, avatar_url,
        email_verified, oauth_provider, ${col})
     VALUES ($1,$2,$3,'both',$4,$5,true,$6,$7) RETURNING *`,
    [
      email || `${provider}_${providerId}@clando.app`,
      firstName || 'Utilisateur',
      lastName  || '',
      randomColor(),
      avatarUrl || null,
      provider,
      providerId,
    ]
  )
}

// ── Google OAuth ─────────────────────────────────────────────
//
// IMPORTANT — callbackURL :
//   Google n'autorise PAS les adresses IP locales (192.168.x.x).
//   Le callbackURL DOIT correspondre exactement à ce qui est
//   enregistré dans la Google Cloud Console.
//
//   ✅ En développement : http://localhost:5000/api/auth/google/callback
//      → fonctionne depuis l'ordinateur qui fait tourner le serveur
//
//   ✅ En production    : https://votre-domaine.com/api/auth/google/callback
//      → à enregistrer dans Google Console + mettre dans GOOGLE_CALLBACK_URL
//
//   ⚠️  Depuis un mobile sur le réseau local, Google OAuth ne fonctionne pas
//      sans ngrok ou un tunnel. Utilisez email/mot de passe depuis mobile.
//
const GOOGLE_CALLBACK = process.env.GOOGLE_CALLBACK_URL
  || `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  GOOGLE_CALLBACK,
      scope:        ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider:   'google',
          providerId: profile.id,
          email:      profile.emails?.[0]?.value,
          firstName:  profile.name?.givenName  || profile.displayName?.split(' ')[0] || 'Utilisateur',
          lastName:   profile.name?.familyName || '',
          avatarUrl:  profile.photos?.[0]?.value?.replace('=s96-c', '=s200-c'),
        })
        done(null, user)
      } catch (err) { console.error('Google OAuth error:', err); done(err, false) }
    }
  ))
  console.log(`  ✅  Google OAuth — callback : ${GOOGLE_CALLBACK}`)
} else {
  console.warn('  ⚠️   Google OAuth non configuré (GOOGLE_CLIENT_ID manquant)')
}

// ── Facebook OAuth ───────────────────────────────────────────
const FACEBOOK_CALLBACK = process.env.FACEBOOK_CALLBACK_URL
  || `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/facebook/callback`

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy(
    {
      clientID:      process.env.FACEBOOK_APP_ID,
      clientSecret:  process.env.FACEBOOK_APP_SECRET,
      callbackURL:   FACEBOOK_CALLBACK,
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider:   'facebook',
          providerId: profile.id,
          email:      profile.emails?.[0]?.value,
          firstName:  profile.name?.givenName  || 'Utilisateur',
          lastName:   profile.name?.familyName || '',
          avatarUrl:  profile.photos?.[0]?.value,
        })
        done(null, user)
      } catch (err) { console.error('Facebook OAuth error:', err); done(err, false) }
    }
  ))
  console.log(`  ✅  Facebook OAuth — callback : ${FACEBOOK_CALLBACK}`)
} else {
  console.warn('  ⚠️   Facebook OAuth non configuré (FACEBOOK_APP_ID manquant)')
}

module.exports = passport
