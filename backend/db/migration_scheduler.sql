-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Rappels automatiques + Avis
--  psql -U postgres -d covoitgo -f db/migration_scheduler.sql
-- ══════════════════════════════════════════════════════════════

-- Flags pour éviter les doublons d'envoi
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_15_sent    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_5_sent     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_request_sent BOOLEAN DEFAULT false;

-- Index pour les requêtes du scheduler
CREATE INDEX IF NOT EXISTS idx_bookings_reminders
  ON bookings(status, reminder_15_sent, reminder_5_sent, review_request_sent);
