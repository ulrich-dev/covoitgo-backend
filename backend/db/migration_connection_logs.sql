-- ══════════════════════════════════════════════════════════════
--  CLANDO — Migration : Logs de connexion
--  psql -U postgres -d clando -f db/migration_connection_logs.sql
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS connection_logs (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_at  TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(64),
    user_agent TEXT,
    method     VARCHAR(20) DEFAULT 'email'  -- email | google | facebook
);

-- Index pour les requêtes de stats
CREATE INDEX IF NOT EXISTS idx_conn_logs_at      ON connection_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_conn_logs_user    ON connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conn_logs_method  ON connection_logs(method);

-- Vue utile : connexions uniques par jour (utilisateurs distincts)
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
    DATE(logged_at)                    AS day,
    COUNT(DISTINCT user_id)            AS unique_users,
    COUNT(*)                           AS total_logins,
    COUNT(*) FILTER (WHERE method = 'email')    AS email_logins,
    COUNT(*) FILTER (WHERE method = 'google')   AS google_logins,
    COUNT(*) FILTER (WHERE method = 'facebook') AS facebook_logins
FROM connection_logs
GROUP BY DATE(logged_at)
ORDER BY day DESC;
