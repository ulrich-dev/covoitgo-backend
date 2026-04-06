-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Véhicule + Documents conducteur
--  Exécutez UNE SEULE FOIS :
--  psql -U postgres -d covoitgo -f db/migration_vehicle.sql
-- ══════════════════════════════════════════════════════════════

-- ── Informations véhicule ──────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS car_brand      VARCHAR(80),   -- Ex: Toyota
  ADD COLUMN IF NOT EXISTS car_model      VARCHAR(80),   -- Ex: Corolla
  ADD COLUMN IF NOT EXISTS car_color      VARCHAR(40),   -- Ex: Blanc
  ADD COLUMN IF NOT EXISTS car_year       SMALLINT,      -- Ex: 2019
  ADD COLUMN IF NOT EXISTS car_plate      VARCHAR(20),   -- Ex: LT 1234 A

  -- Documents (chemins vers les fichiers uploadés)
  ADD COLUMN IF NOT EXISTS license_doc    TEXT,          -- Chemin permis de conduire
  ADD COLUMN IF NOT EXISTS identity_doc   TEXT,          -- Chemin pièce d'identité

  -- Statut de vérification des documents (par l'admin)
  ADD COLUMN IF NOT EXISTS docs_status    VARCHAR(20)    DEFAULT 'none'
                           CHECK (docs_status IN ('none','pending','verified','rejected'));

-- Index
CREATE INDEX IF NOT EXISTS idx_users_docs_status ON users(docs_status);

-- ── FIN MIGRATION ───────────────────────────────────────────────
