-- ============================================================
-- Event Management System — Database Schema
-- PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- 1. USERS
-- ──────────────────────────────────────────────
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'participant'
                    CHECK (role IN ('admin', 'organizer', 'participant')),
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- ──────────────────────────────────────────────
-- 2. EVENTS
-- ──────────────────────────────────────────────
CREATE TABLE events (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(255)  NOT NULL,
    description   TEXT,
    event_date    TIMESTAMP     NOT NULL,
    venue         VARCHAR(255)  NOT NULL,
    capacity      INTEGER       NOT NULL CHECK (capacity > 0),
    organizer_id  INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status        VARCHAR(20)   NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_organizer   ON events (organizer_id);
CREATE INDEX idx_events_date        ON events (event_date);
CREATE INDEX idx_events_status      ON events (status);

-- ──────────────────────────────────────────────
-- 3. REGISTRATIONS  (many-to-many users ↔ events)
-- ──────────────────────────────────────────────
CREATE TABLE registrations (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER       NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    event_id      INTEGER       NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    qr_token      UUID          NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    registered_at TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_registration UNIQUE (user_id, event_id)
);

CREATE INDEX idx_reg_user   ON registrations (user_id);
CREATE INDEX idx_reg_event  ON registrations (event_id);
CREATE INDEX idx_reg_qr     ON registrations (qr_token);

-- ──────────────────────────────────────────────
-- 4. ATTENDANCE
-- ──────────────────────────────────────────────
CREATE TABLE attendance (
    id               SERIAL PRIMARY KEY,
    registration_id  INTEGER   NOT NULL REFERENCES registrations(id) ON DELETE CASCADE UNIQUE,
    marked_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_att_reg ON attendance (registration_id);

-- ──────────────────────────────────────────────
-- 5. CERTIFICATES
-- ──────────────────────────────────────────────
CREATE TABLE certificates (
    id               SERIAL PRIMARY KEY,
    registration_id  INTEGER      NOT NULL REFERENCES registrations(id) ON DELETE CASCADE UNIQUE,
    certificate_uid  UUID         NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    issued_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    file_path        VARCHAR(500)
);

CREATE INDEX idx_cert_reg ON certificates (registration_id);
CREATE INDEX idx_cert_uid ON certificates (certificate_uid);
