const pool = require('../config/db');
const { createNotification } = require('./notifications');

// Admin opens OTP attendance session
async function openOTPSession(req, res) {
  const { id: eventId } = req.params;

  try {
    // Verify event ownership
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });

    const event = eventCheck.rows[0];
    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Close any existing open session
    await pool.query(
      `UPDATE event_otp_sessions SET is_open = FALSE, closed_at = NOW()
       WHERE event_id = $1 AND is_open = TRUE`,
      [eventId]
    );

    // Create new session
    const sessionResult = await pool.query(
      'INSERT INTO event_otp_sessions (event_id) VALUES ($1) RETURNING *',
      [eventId]
    );
    const session = sessionResult.rows[0];

    // Get ONLY participant registrations (exclude organizer and admins)
    const regs = await pool.query(
      `SELECT r.id as registration_id, r.user_id, u.name
       FROM registrations r JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 AND u.role = 'participant'`,
      [eventId]
    );

    // Generate unique 6-digit OTP for each participant
    const otpPromises = regs.rows.map(async (reg) => {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry

      await pool.query(
        `INSERT INTO attendance_otps (session_id, registration_id, otp_code, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [session.id, reg.registration_id, otp, expiresAt]
      );

      // Send notification with OTP only to participants
      await createNotification(
        reg.user_id,
        parseInt(eventId),
        'otp_generated',
        'Attendance OTP Generated',
        `Your OTP for "${event.title}" is: ${otp}. Enter this code on the event page to mark your attendance. Valid for 30 minutes.`
      );

      await createNotification(
        reg.user_id,
        parseInt(eventId),
        'attendance_open',
        'Attendance Entry Opened',
        `Attendance entry is now open for "${event.title}". Check your inbox for your OTP code.`
      );
    });

    await Promise.all(otpPromises);

    res.json({
      message: `OTP session opened. ${regs.rows.length} OTPs generated and sent to participants' inboxes.`,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Open OTP session error:', error);
    res.status(500).json({ error: 'Server error opening OTP session.' });
  }
}

// Admin closes OTP session
async function closeOTPSession(req, res) {
  const { id: eventId } = req.params;

  try {
    const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const result = await pool.query(
      `UPDATE event_otp_sessions SET is_open = FALSE, closed_at = NOW()
       WHERE event_id = $1 AND is_open = TRUE RETURNING *`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No open OTP session found for this event.' });
    }

    res.json({ message: 'OTP session closed.' });
  } catch (error) {
    console.error('Close OTP session error:', error);
    res.status(500).json({ error: 'Server error closing OTP session.' });
  }
}

// Check OTP session status
async function getOTPStatus(req, res) {
  const { id: eventId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM event_otp_sessions WHERE event_id = $1 ORDER BY opened_at DESC LIMIT 1`,
      [eventId]
    );

    if (result.rows.length === 0) {
      return res.json({ is_open: false, session: null });
    }

    const session = result.rows[0];

    // If user is participant, also get their OTP status
    let otpInfo = null;
    if (req.user.role === 'participant') {
      const reg = await pool.query(
        'SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2',
        [eventId, req.user.id]
      );
      if (reg.rows.length > 0) {
        const otpResult = await pool.query(
          `SELECT is_used, expires_at FROM attendance_otps
           WHERE session_id = $1 AND registration_id = $2`,
          [session.id, reg.rows[0].id]
        );
        if (otpResult.rows.length > 0) {
          otpInfo = otpResult.rows[0];
        }
      }
    }

    // If organizer, also get stats
    let stats = null;
    if (req.user.role === 'admin' || req.user.role === 'organizer') {
      const totalOtps = await pool.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_used) as used FROM attendance_otps WHERE session_id = $1',
        [session.id]
      );
      stats = totalOtps.rows[0];
    }

    res.json({
      is_open: session.is_open,
      session,
      otp_info: otpInfo,
      stats,
    });
  } catch (error) {
    console.error('OTP status error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

// Participant verifies OTP
async function verifyOTP(req, res) {
  const { id: eventId } = req.params;
  const { otp_code } = req.body;
  const userId = req.user.id;

  try {
    // Get active session
    const sessionResult = await pool.query(
      'SELECT * FROM event_otp_sessions WHERE event_id = $1 AND is_open = TRUE ORDER BY opened_at DESC LIMIT 1',
      [eventId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active OTP session. Attendance entry is closed.' });
    }

    const session = sessionResult.rows[0];

    // Get user's registration
    const regResult = await pool.query(
      'SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (regResult.rows.length === 0) {
      return res.status(400).json({ error: 'You are not registered for this event.' });
    }

    const registrationId = regResult.rows[0].id;

    // Verify OTP
    const otpResult = await pool.query(
      `SELECT * FROM attendance_otps
       WHERE session_id = $1 AND registration_id = $2 AND otp_code = $3`,
      [session.id, registrationId, otp_code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid OTP code.' });
    }

    const otp = otpResult.rows[0];

    if (otp.is_used) {
      return res.status(400).json({ error: 'OTP already used. Attendance already marked.' });
    }

    if (new Date(otp.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    // Mark OTP as used
    await pool.query('UPDATE attendance_otps SET is_used = TRUE WHERE id = $1', [otp.id]);

    // Mark attendance in existing attendance table
    try {
      await pool.query('INSERT INTO attendance (registration_id) VALUES ($1)', [registrationId]);
    } catch (err) {
      if (err.code === '23505') {
        return res.json({ message: 'Attendance was already marked.' });
      }
      throw err;
    }

    res.json({ message: 'OTP verified! Attendance marked successfully.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error verifying OTP.' });
  }
}

module.exports = { openOTPSession, closeOTPSession, getOTPStatus, verifyOTP };
