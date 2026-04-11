-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration : Système Freemium Conducteur
--  psql -U postgres -d clando -f db/migration_freemium.sql
-- ══════════════════════════════════════════════════════════════

-- Colonnes sur la table users
ALTER TABLE users
  -- Nombre de trajets publiés (compteur total)
  ADD COLUMN IF NOT EXISTS trips_published    INTEGER     DEFAULT 0,
  -- Trajets gratuits restants (10 au départ)
  ADD COLUMN IF NOT EXISTS free_trips_left    INTEGER     DEFAULT 10,
  -- Montant dû à Clando (FCFA)
  ADD COLUMN IF NOT EXISTS balance_due        DECIMAL(10,2) DEFAULT 0.00,
  -- Blocage pour impayé (admin le lève après paiement)
  ADD COLUMN IF NOT EXISTS payment_blocked    BOOLEAN     DEFAULT false,
  -- Date du dernier paiement
  ADD COLUMN IF NOT EXISTS last_payment_at    TIMESTAMPTZ;

-- Index
CREATE INDEX IF NOT EXISTS idx_users_payment_blocked ON users(payment_blocked) WHERE payment_blocked = true;
CREATE INDEX IF NOT EXISTS idx_users_balance_due     ON users(balance_due)     WHERE balance_due > 0;

-- Table des paiements / demandes de paiement
CREATE TABLE IF NOT EXISTS payment_requests (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount       DECIMAL(10,2) NOT NULL,
    method       VARCHAR(30) NOT NULL DEFAULT 'mtn_momo'
                 CHECK (method IN ('mtn_momo', 'orange_money', 'bank', 'cash')),
    phone        VARCHAR(20),
    reference    VARCHAR(100),     -- référence de transaction fournie par l'utilisateur
    status       VARCHAR(20)  DEFAULT 'pending'
                 CHECK (status IN ('pending', 'confirmed', 'rejected')),
    note         TEXT,             -- note de l'admin
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_user   ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
