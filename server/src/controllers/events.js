const pool = require('../config/db');
const { createNotification } = require('./notifications');

// List events with pagination and search — includes current_registrations
async function getEvents(req, res) {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, u.name as organizer_name,
             (SELECT COUNT(*) FROM registrations WHERE event_id = e.id) as current_registrations
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count for pagination
    const countQuery = query.replace(
      /SELECT e\.\*, u\.name as organizer_name,\s*\(SELECT COUNT\(\*\) FROM registrations WHERE event_id = e\.id\) as current_registrations/,
      'SELECT COUNT(*)'
    );
    const totalResult = await pool.query(countQuery, params);
    const totalCount = parseInt(totalResult.rows[0].count);

    // Add pagination to main query
    query += ` ORDER BY e.event_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      events: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Server error fetching events.' });
  }
}

// Get single event
async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, u.name as organizer_name,
             (SELECT COUNT(*) FROM registrations WHERE event_id = e.id) as current_registrations
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    res.json({ event: result.rows[0] });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Server error fetching event.' });
  }
}

// Create event
async function createEvent(req, res) {
  try {
    const { title, description, event_date, venue, capacity } = req.body;
    const organizer_id = req.user.id;

    const result = await pool.query(
      `INSERT INTO events (title, description, event_date, venue, capacity, organizer_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, event_date, venue, capacity, organizer_id]
    );

    res.status(201).json({
      message: 'Event created successfully.',
      event: result.rows[0]
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Server error creating event.' });
  }
}

// Update event
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { title, description, event_date, venue, capacity, status } = req.body;

    // Check ownership
    const eventCheck = await pool.query('SELECT organizer_id, title FROM events WHERE id = $1', [id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to edit this event.' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title) { updates.push(`title = $${paramIndex++}`); params.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
    if (event_date) { updates.push(`event_date = $${paramIndex++}`); params.push(event_date); }
    if (venue) { updates.push(`venue = $${paramIndex++}`); params.push(venue); }
    if (capacity) { updates.push(`capacity = $${paramIndex++}`); params.push(capacity); }
    if (status) { updates.push(`status = $${paramIndex++}`); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    res.json({
      message: 'Event updated successfully.',
      event: result.rows[0]
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Server error updating event.' });
  }
}

// Change event status with notifications to all participants
async function changeEventStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Check ownership
    const eventCheck = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = eventCheck.rows[0];

    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Update status
    const result = await pool.query(
      `UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    // Get all participants to notify (only role='participant')
    const participants = await pool.query(
      `SELECT r.user_id FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 AND u.role = 'participant'`,
      [id]
    );

    // Send notifications based on status change
    const notifMap = {
      ongoing: {
        type: 'event_started',
        title: 'Event Started! 🎉',
        message: `"${event.title}" has started. Join now!`,
      },
      completed: {
        type: 'event_ended',
        title: 'Event Ended',
        message: `"${event.title}" has concluded. Thank you for participating!`,
      },
      cancelled: {
        type: 'event_cancelled',
        title: 'Event Cancelled ❌',
        message: `"${event.title}" has been cancelled by the organizer.`,
      },
    };

    if (notifMap[status]) {
      const { type, title, message } = notifMap[status];
      await Promise.all(
        participants.rows.map((p) =>
          createNotification(p.user_id, parseInt(id), type, title, message)
        )
      );
    }

    res.json({
      message: `Event status changed to "${status}".`,
      event: result.rows[0],
    });

  } catch (error) {
    console.error('Change event status error:', error);
    res.status(500).json({ error: 'Server error changing event status.' });
  }
}

// Delete event
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    // Check ownership
    const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this event.' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    res.json({ message: 'Event deleted successfully.' });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Server error deleting event.' });
  }
}

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  changeEventStatus,
  deleteEvent
};
