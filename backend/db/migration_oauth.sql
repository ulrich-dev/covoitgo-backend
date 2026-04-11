-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration OAuth (Google + Facebook)
--  Exécutez UNE SEULE FOIS :
--  psql -U postgres -d clando -f db/migration_oauth.sql
-- ══════════════════════════════════════════════════════════════

-- Colonnes OAuth
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id      VARCHAR(128)  UNIQUE,
  ADD COLUMN IF NOT EXISTS facebook_id    VARCHAR(128)  UNIQUE,
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20),   -- 'google' | 'facebook' | NULL
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT;          -- URL photo de profil OAuth

-- Le mot de passe devient optionnel (compte OAuth n'en a pas)
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Les comptes OAuth sont directement vérifiés
-- (Google/Facebook ont déjà vérifié l'email)
CREATE INDEX IF NOT EXISTS idx_users_google_id   ON users(google_id)   WHERE google_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL;

-- ── FIN MIGRATION OAUTH ────────────────────────────────────────
