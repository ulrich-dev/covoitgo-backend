-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration : Rôle administrateur
--  Exécutez UNE SEULE FOIS :
--  psql -U postgres -d clando -f db/migration_admin.sql
-- ══════════════════════════════════════════════════════════════

-- Ajouter la colonne is_admin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Promouvoir le premier utilisateur en admin (optionnel)
-- UPDATE users SET is_admin = true WHERE email = 'votre@email.com';

-- Index
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) WHERE is_admin = true;
