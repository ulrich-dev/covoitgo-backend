-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration : Historique des appels vocaux
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS call_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  caller_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  callee_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  duration    INTEGER,    -- secondes
  status      VARCHAR(20) DEFAULT 'missed'
              CHECK (status IN ('answered','missed','rejected','failed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_booking ON call_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller  ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_callee  ON call_logs(callee_id);
