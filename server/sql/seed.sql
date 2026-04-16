-- ============================================================
-- Seed Data for Event Management System
-- Passwords are all "password123" hashed with bcrypt
-- ============================================================

-- Admin user
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User',     'admin@eventmgr.com',     '$2a$10$xJwE5G5z5z5z5z5z5z5z5eFakeHashForSeedDataOnly000001', 'admin'),
('Jane Organizer', 'jane@eventmgr.com',      '$2a$10$xJwE5G5z5z5z5z5z5z5z5eFakeHashForSeedDataOnly000002', 'organizer'),
('Bob Participant','bob@eventmgr.com',        '$2a$10$xJwE5G5z5z5z5z5z5z5z5eFakeHashForSeedDataOnly000003', 'participant'),
('Alice Student',  'alice@eventmgr.com',      '$2a$10$xJwE5G5z5z5z5z5z5z5z5eFakeHashForSeedDataOnly000004', 'participant'),
('Charlie Dev',    'charlie@eventmgr.com',    '$2a$10$xJwE5G5z5z5z5z5z5z5z5eFakeHashForSeedDataOnly000005', 'participant');

-- NOTE: The hashes above are placeholders.
-- Use the /api/auth/register endpoint to create real users with proper bcrypt hashes.

-- Events (organizer_id = 2 → Jane Organizer)
INSERT INTO events (title, description, event_date, venue, capacity, organizer_id, status) VALUES
('Tech Conference 2026',
 'Annual technology conference featuring talks on AI, Cloud, and Web3.',
 '2026-04-15 09:00:00', 'Main Auditorium, Tech Park', 200, 2, 'upcoming'),

('Web Development Workshop',
 'Hands-on workshop covering modern React, Node.js, and database design.',
 '2026-04-20 10:00:00', 'Lab 3, CS Building', 50, 2, 'upcoming'),

('Data Science Bootcamp',
 'Intensive 2-day bootcamp on data analysis, ML, and visualization.',
 '2026-05-01 09:00:00', 'Conference Hall A', 100, 2, 'upcoming'),

('Hackathon Spring 2026',
 '24-hour hackathon — build and pitch your project.',
 '2026-05-10 08:00:00', 'Innovation Hub', 150, 2, 'upcoming');
