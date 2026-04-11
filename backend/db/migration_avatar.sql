-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration : Photo de profil utilisateur
--  psql -U postgres -d clando -f db/migration_avatar.sql
-- ══════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Index pour recherche par avatar_url (utile pour nettoyage)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;
