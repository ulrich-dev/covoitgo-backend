-- ══════════════════════════════════════════════════════════════
--  COVOITGO — Schéma de base de données PostgreSQL
--  Version 1.0
-- ══════════════════════════════════════════════════════════════

-- Active l'extension uuid (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
--  1. TABLE USERS
--  Contient tous les utilisateurs (conducteurs & passagers)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    birth_date      DATE,
    phone           VARCHAR(20),
    role            VARCHAR(20)  NOT NULL DEFAULT 'both'
                    CHECK (role IN ('passenger', 'driver', 'both')),
    bio             TEXT,
    avatar_color    VARCHAR(20)  DEFAULT '#0f9b7a',
    -- Statistiques conducteur
    avg_rating      DECIMAL(3,2) DEFAULT 0.0,
    review_count    INTEGER      DEFAULT 0,
    -- Vérification
    is_verified     BOOLEAN      DEFAULT false,
    is_active       BOOLEAN      DEFAULT true,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Index pour accélérer les recherches par email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ──────────────────────────────────────────────────────────────
--  2. TABLE SESSIONS (gérée par connect-pg-simple)
--  Stocke les sessions utilisateurs côté serveur
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session (
    sid     VARCHAR     NOT NULL COLLATE "default",
    sess    JSON        NOT NULL,
    expire  TIMESTAMP(6) NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

-- ──────────────────────────────────────────────────────────────
--  3. TABLE TRIPS (trajets proposés)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Lieux
    origin_city       VARCHAR(150) NOT NULL,
    origin_address    VARCHAR(255),
    destination_city  VARCHAR(150) NOT NULL,
    destination_address VARCHAR(255),
    -- Date et heure
    departure_at      TIMESTAMPTZ NOT NULL,
    estimated_arrival TIMESTAMPTZ,
    -- Détails
    available_seats   SMALLINT    NOT NULL CHECK (available_seats BETWEEN 1 AND 8),
    price_per_seat    DECIMAL(8,2) NOT NULL CHECK (price_per_seat >= 0),
    description       TEXT,
    -- Préférences (tableau de tags)
    preferences       TEXT[]      DEFAULT '{}',
    -- Statut
    status            VARCHAR(20)  DEFAULT 'active'
                      CHECK (status IN ('active', 'full', 'cancelled', 'completed')),
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- Index pour accélérer les recherches de trajets
CREATE INDEX IF NOT EXISTS idx_trips_origin      ON trips(origin_city);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips(destination_city);
CREATE INDEX IF NOT EXISTS idx_trips_departure   ON trips(departure_at);
CREATE INDEX IF NOT EXISTS idx_trips_driver      ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status      ON trips(status);

-- ──────────────────────────────────────────────────────────────
--  4. TABLE BOOKINGS (réservations)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id       UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    passenger_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_booked  SMALLINT    NOT NULL DEFAULT 1 CHECK (seats_booked >= 1),
    -- Statut de la réservation
    status        VARCHAR(20)  DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    message       TEXT,        -- Message du passager au conducteur
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW(),
    -- Un passager ne peut réserver qu'une fois par trajet
    UNIQUE(trip_id, passenger_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_trip      ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);

-- ──────────────────────────────────────────────────────────────
--  5. TABLE REVIEWS (avis)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    -- Un seul avis par réservation par utilisateur
    UNIQUE(booking_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ──────────────────────────────────────────────────────────────
--  6. TABLE MESSAGES (messagerie interne)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content      TEXT        NOT NULL,
    is_read      BOOLEAN     DEFAULT false,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender  ON messages(sender_id);

-- ──────────────────────────────────────────────────────────────
--  7. TRIGGER — Mise à jour automatique de updated_at
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────────
--  8. TRIGGER — Recalcul automatique de la note moyenne
--  Se déclenche après chaque nouvel avis
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        avg_rating   = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE reviewee_id = NEW.reviewee_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = NEW.reviewee_id)
    WHERE id = NEW.reviewee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_rating
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- ──────────────────────────────────────────────────────────────
--  9. TRIGGER — Mise à jour du statut du trajet
--  Quand toutes les places sont réservées → status = 'full'
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_trip_status()
RETURNS TRIGGER AS $$
DECLARE
    booked_seats INTEGER;
    total_seats  INTEGER;
BEGIN
    SELECT COALESCE(SUM(seats_booked), 0) INTO booked_seats
    FROM bookings
    WHERE trip_id = NEW.trip_id AND status IN ('pending', 'confirmed');

    SELECT available_seats INTO total_seats
    FROM trips WHERE id = NEW.trip_id;

    IF booked_seats >= total_seats THEN
        UPDATE trips SET status = 'full' WHERE id = NEW.trip_id AND status = 'active';
    ELSE
        UPDATE trips SET status = 'active' WHERE id = NEW.trip_id AND status = 'full';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_update_trip_status
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_trip_status();

-- ──────────────────────────────────────────────────────────────
--  10. DONNÉES DE TEST (optionnel — à commenter en prod)
-- ──────────────────────────────────────────────────────────────
-- Mot de passe de test : "Test1234!" (haché avec bcrypt, rounds=10)
INSERT INTO users (email, password_hash, first_name, last_name, birth_date, role, bio, avatar_color)
VALUES
(
    'marc@test.fr',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'Marc', 'Dupont', '1990-05-15', 'both',
    'Conducteur expérimenté, musique jazz et bonne humeur garantie !',
    '#0f9b7a'
),
(
    'sophie@test.fr',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Sophie', 'Laurent', '1995-08-22', 'passenger',
    'Passagère ponctuelle, j''adore faire de nouvelles rencontres.',
    '#f25c2b'
)
ON CONFLICT (email) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- FIN DU SCHÉMA
-- ══════════════════════════════════════════════════════════════
