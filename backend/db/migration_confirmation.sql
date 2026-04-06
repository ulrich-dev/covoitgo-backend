-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Confirmation mutuelle des trajets
--  psql -U postgres -d covoitgo -f db/migration_confirmation.sql
-- ══════════════════════════════════════════════════════════════

-- Colonnes de confirmation sur les réservations
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS driver_confirmed    BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS passenger_confirmed BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS driver_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS passenger_confirmed_at TIMESTAMPTZ,
  -- Fenêtre de contestation : si une partie conteste dans les 24h, le trajet reste en litige
  ADD COLUMN IF NOT EXISTS disputed            BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_reason      TEXT,
  -- Notification "confirme ton trajet" déjà envoyée
  ADD COLUMN IF NOT EXISTS confirm_notif_sent  BOOLEAN     DEFAULT false;

-- Mettre à jour le CHECK sur le statut pour ajouter 'disputed'
-- (on garde 'completed' pour les trajets validés)
-- Note: PostgreSQL ne supporte pas la modification d'un CHECK directement,
-- on le supprime et recrée
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'disputed'));

-- Index pour le scheduler
CREATE INDEX IF NOT EXISTS idx_bookings_confirm
  ON bookings(status, driver_confirmed, passenger_confirmed, confirm_notif_sent);
