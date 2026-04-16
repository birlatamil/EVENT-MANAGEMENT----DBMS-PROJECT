const pool = require('../config/db');

async function getAdminStats(req, res) {
  try {
    const stats = {};

    // Basic Counts
    const userCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'participant'");
    const eventCount = await pool.query('SELECT COUNT(*) FROM events');
    const regCount = await pool.query('SELECT COUNT(*) FROM registrations');
    const attCount = await pool.query('SELECT COUNT(*) FROM attendance');

    stats.total_participants = parseInt(userCount.rows[0].count);
    stats.total_events = parseInt(eventCount.rows[0].count);
    stats.total_registrations = parseInt(regCount.rows[0].count);
    stats.total_attendance = parseInt(attCount.rows[0].count);

    // Recent Events
    const recentEvents = await pool.query(`
      SELECT e.id, e.title, e.event_date,
             (SELECT COUNT(*) FROM registrations WHERE event_id = e.id) as regs,
             (SELECT COUNT(*) FROM attendance a JOIN registrations r ON a.registration_id = r.id WHERE r.event_id = e.id) as atts
      FROM events e
      ORDER BY e.created_at DESC
      LIMIT 5
    `);
    stats.recent_events = recentEvents.rows;

    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
}

async function getOrganizerStats(req, res) {
  try {
    const organizerId = req.user.id;
    const stats = {};

    // Get Organizer's events
    const eventCount = await pool.query('SELECT COUNT(*) FROM events WHERE organizer_id = $1', [organizerId]);
    stats.total_events = parseInt(eventCount.rows[0].count);

    // Get total registrations for these events
    const regs = await pool.query(`
      SELECT COUNT(*)
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE e.organizer_id = $1
    `, [organizerId]);
    stats.total_registrations = parseInt(regs.rows[0].count);

    // My Events list with stats
    const eventsList = await pool.query(`
      SELECT e.id, e.title, e.event_date, e.status, e.capacity,
             (SELECT COUNT(*) FROM registrations WHERE event_id = e.id) as regs,
             (SELECT COUNT(*) FROM attendance a JOIN registrations r ON a.registration_id = r.id WHERE r.event_id = e.id) as atts
      FROM events e
      WHERE e.organizer_id = $1
      ORDER BY e.event_date DESC
    `, [organizerId]);

    stats.events_performance = eventsList.rows;

    res.json(stats);
  } catch (error) {
    console.error('Organizer stats error:', error);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
}

module.exports = {
  getAdminStats,
  getOrganizerStats
};
