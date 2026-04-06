-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Alertes trajets + Favoris
--  psql -U postgres -d covoitgo -f db/migration_alerts.sql
-- ══════════════════════════════════════════════════════════════

-- ── Table alertes trajets ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_alerts (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_city      VARCHAR(100) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  date_from        DATE,
  date_to          DATE,
  max_price        INTEGER,
  seats_needed     SMALLINT     DEFAULT 1,
  is_active        BOOLEAN      DEFAULT true,
  notified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user
  ON trip_alerts(user_id);

CREATE INDEX IF NOT EXISTS idx_alerts_active
  ON trip_alerts(origin_city, destination_city)
  WHERE is_active = true;

-- ── Table favoris itinéraires ─────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_favorites (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_city      VARCHAR(100) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  notify           BOOLEAN      DEFAULT true,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, origin_city, destination_city)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON trip_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_route
  ON trip_favorites(origin_city, destination_city)
  WHERE notify = true;
