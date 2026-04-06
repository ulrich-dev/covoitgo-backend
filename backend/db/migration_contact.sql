-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Migration : Messages de contact + Réponses
--  psql -U postgres -d covoitgo -f db/migration_contact.sql
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contact_messages (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    category    VARCHAR(50)  NOT NULL,
    subject     VARCHAR(150) NOT NULL,
    message     TEXT         NOT NULL,
    status      VARCHAR(20)  DEFAULT 'new'
                CHECK (status IN ('new', 'in_progress', 'resolved')),
    email_sent  BOOLEAN      DEFAULT false,
    ip_address  VARCHAR(64),
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Fil de discussion : réponses admin et client
CREATE TABLE IF NOT EXISTS contact_replies (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id   UUID        NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
    author_type  VARCHAR(10) NOT NULL CHECK (author_type IN ('admin', 'client')),
    author_name  VARCHAR(100) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    body         TEXT        NOT NULL,
    email_sent   BOOLEAN     DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_status  ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_contact ON contact_replies(contact_id, created_at);
