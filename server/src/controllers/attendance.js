const pool = require('../config/db');

async function markAttendance(req, res) {
  const { qr_token, event_id } = req.body;

  try {
    // Verify event ownership
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to mark attendance for this event.' });
    }

    // Find registration by QR token and verify it belongs to this event
    const regQuery = `
      SELECT r.id as registration_id, r.user_id, u.name as user_name
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.qr_token = $1 AND r.event_id = $2
    `;

    const regResult = await pool.query(regQuery, [qr_token, event_id]);

    if (regResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid QR code for this event.' });
    }

    const { registration_id, user_name } = regResult.rows[0];

    // Mark attendance
    try {
      await pool.query(
        'INSERT INTO attendance (registration_id) VALUES ($1)',
        [registration_id]
      );

      res.json({
        message: 'Attendance marked successfully.',
        participant: user_name
      });
    } catch (err) {
      if (err.code === '23505') { // Postgres duplicate key constraint
        return res.status(400).json({ error: 'Attendance already marked for this participant.' });
      }
      throw err;
    }

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Server error marking attendance.' });
  }
}

async function exportAttendanceCSV(req, res) {
  const { id: eventId } = req.params;

  try {
    // Check ownership
    const eventCheck = await pool.query('SELECT title, organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = eventCheck.rows[0];

    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to export attendance for this event.' });
    }

    const query = `
      SELECT u.name, u.email, r.registered_at,
             CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'Absent' END as status,
             a.marked_at
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN attendance a ON a.registration_id = r.id
      WHERE r.event_id = $1
      ORDER BY u.name ASC
    `;

    const result = await pool.query(query, [eventId]);

    // Build CSV manually
    let csvData = 'Name,Email,Registered At,Status,Marked At\n';
    result.rows.forEach(row => {
      csvData += `"${row.name}","${row.email}","${row.registered_at}","${row.status}","${row.marked_at || ''}"\n`;
    });

    const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${safeTitle}.csv`);
    res.send(csvData);

  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ error: 'Server error exporting attendance.' });
  }
}

module.exports = {
  markAttendance,
  exportAttendanceCSV
};
