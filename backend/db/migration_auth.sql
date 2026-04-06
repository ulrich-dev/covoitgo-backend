-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Email verification + Password reset
--  Exécutez ce fichier UNE SEULE FOIS après schema.sql
--  psql -U postgres -d covoitgo -f db/migration_auth.sql
-- ══════════════════════════════════════════════════════════════

-- Ajout des colonnes de vérification email
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified      BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS verify_token        VARCHAR(128),
  ADD COLUMN IF NOT EXISTS verify_token_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_token         VARCHAR(128),
  ADD COLUMN IF NOT EXISTS reset_token_expires  TIMESTAMPTZ;

-- Index pour les lookups rapides par token
CREATE INDEX IF NOT EXISTS idx_users_verify_token ON users(verify_token) WHERE verify_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token  ON users(reset_token)  WHERE reset_token  IS NOT NULL;

-- Les utilisateurs de test sont déjà vérifiés
UPDATE users SET email_verified = true WHERE email IN ('marc@test.fr', 'sophie@test.fr');

-- ── FIN MIGRATION ──────────────────────────────────────────────
