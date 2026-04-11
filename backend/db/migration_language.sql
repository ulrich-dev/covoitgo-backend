-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration : Langue utilisateur
--  psql -U postgres -d clando -f db/migration_language.sql
-- ══════════════════════════════════════════════════════════════

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Mettre à jour les utilisateurs existants qui n'ont pas de langue
UPDATE users SET language = 'fr' WHERE language IS NULL;
