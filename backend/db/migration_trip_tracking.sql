-- ══════════════════════════════════════════════════════════════
--  Migration : Suivi GPS temps réel des trajets
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trip_tracking (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20)  CHECK (role IN ('driver','passenger')),
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  heading     DECIMAL(6,2),
  speed       DECIMAL(6,2),
  accuracy    DECIMAL(8,2),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_booking ON trip_tracking(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_user    ON trip_tracking(user_id);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(20) DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS trip_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trip_ended_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mid_trip_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin_lat       DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS origin_lon       DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS destination_lat  DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS destination_lon  DECIMAL(10,7);

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin_lat       DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS origin_lon       DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS destination_lat  DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS destination_lon  DECIMAL(10,7);
