-- ============================================================
-- EventHive — Feature Migration Script
-- Run this against your PostgreSQL database
-- ============================================================

-- 1) Chat Messages (per-event real-time chat)
CREATE TABLE IF NOT EXISTS chat_messages (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_event ON chat_messages(event_id, created_at);

-- 2) Event OTP Sessions (admin opens / closes OTP attendance window)
CREATE TABLE IF NOT EXISTS event_otp_sessions (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  is_open       BOOLEAN DEFAULT TRUE,
  opened_at     TIMESTAMP DEFAULT NOW(),
  closed_at     TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_otp_session_event ON event_otp_sessions(event_id);

-- 3) Attendance OTPs (one per participant per session)
CREATE TABLE IF NOT EXISTS attendance_otps (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL REFERENCES event_otp_sessions(id) ON DELETE CASCADE,
  registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  otp_code        VARCHAR(6) NOT NULL,
  is_used         BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, registration_id)
);
CREATE INDEX IF NOT EXISTS idx_otp_reg ON attendance_otps(registration_id);

-- 4) Notifications (in-app inbox for participants)
CREATE TABLE IF NOT EXISTS notifications (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  message       TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read, created_at DESC);

-- 5) Certificate Templates (custom image + name region per event)
CREATE TABLE IF NOT EXISTS certificate_templates (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  image_path    VARCHAR(500) NOT NULL,
  name_x        INTEGER DEFAULT 50,
  name_y        INTEGER DEFAULT 50,
  name_width    INTEGER DEFAULT 400,
  name_height   INTEGER DEFAULT 60,
  font_size     INTEGER DEFAULT 36,
  font_color    VARCHAR(20) DEFAULT '#000000',
  font_family   VARCHAR(100) DEFAULT 'Helvetica-Bold',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
