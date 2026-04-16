const pool = require('../config/db');
const qrcode = require('qrcode');

async function registerForEvent(req, res) {
  const { id: eventId } = req.params;
  const userId = req.user.id;

  try {
    // Check if event exists and is upcoming
    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = eventResult.rows[0];
    if (event.status !== 'upcoming') {
      return res.status(400).json({ error: 'Event is not open for registration.' });
    }

    // Check capacity
    const regCountObj = await pool.query('SELECT COUNT(*) FROM registrations WHERE event_id = $1', [eventId]);
    if (parseInt(regCountObj.rows[0].count) >= event.capacity) {
      return res.status(400).json({ error: 'Event capacity reached.' });
    }

    // Try to register (unique constraint will catch duplicates, but we use ON CONFLICT for safer error handling)
    const registerQuery = `
      INSERT INTO registrations (user_id, event_id)
      VALUES ($1, $2)
      RETURNING id, qr_token
    `;

    try {
      const regResult = await pool.query(registerQuery, [userId, eventId]);
      const registration = regResult.rows[0];

      // Generate Base64 QR code locally for immediate display
      const qrDataUrl = await qrcode.toDataURL(registration.qr_token);

      res.status(201).json({
        message: 'Registration successful.',
        registration: {
          id: registration.id,
          qr_token: registration.qr_token,
          qr_code_image: qrDataUrl
        }
      });
    } catch (err) {
      if (err.code === '23505') { // Postgres duplicate key error code
        return res.status(400).json({ error: 'You are already registered for this event.' });
      }
      throw err;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
}

async function getEventRegistrations(req, res) {
  const { id: eventId } = req.params;

  try {
    // Check ownership
    const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to view these registrations.' });
    }

    const query = `
      SELECT r.id as registration_id, r.registered_at, r.qr_token,
             u.id as user_id, u.name, u.email,
             CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_attended
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN attendance a ON a.registration_id = r.id
      WHERE r.event_id = $1
      ORDER BY r.registered_at DESC
    `;

    const result = await pool.query(query, [eventId]);
    res.json({ registrations: result.rows });

  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Server error fetching registrations.' });
  }
}

// User viewing their own registrations
async function getMyRegistrations(req, res) {
  try {
    const userId = req.user.id;

    const query = `
      SELECT r.id as registration_id, r.registered_at, r.qr_token,
             e.id as event_id, e.title, e.event_date, e.venue, e.status,
             CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_attended
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      LEFT JOIN attendance a ON a.registration_id = r.id
      WHERE r.user_id = $1
      ORDER BY e.event_date DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json({ registrations: result.rows });

  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ error: 'Server error fetching your registrations.' });
  }
}

module.exports = {
  registerForEvent,
  getEventRegistrations,
  getMyRegistrations
};
