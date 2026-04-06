-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Statut 'inquiry' pour les contacts
--  psql -U postgres -d covoitgo -f db/migration_inquiry.sql
-- ══════════════════════════════════════════════════════════════

-- Mettre à jour le CHECK pour accepter 'inquiry'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'inquiry',
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'disputed'
  ));
