const pool = require('../config/db');

async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT n.*, e.title as event_title
      FROM notifications n
      LEFT JOIN events e ON n.event_id = e.id
      WHERE n.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (type && type !== 'all') {
      query += ` AND n.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1`;
    const countParams = [userId];
    if (type && type !== 'all') {
      countQuery += ` AND type = $2`;
      countParams.push(type);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error fetching notifications.' });
  }
}

async function getUnreadCount(req, res) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function markAllRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

// Utility: create notification and optionally push via socket
async function createNotification(userId, eventId, type, title, message) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, event_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, eventId, type, title, message]
    );
    // Push via Socket.IO if available
    try {
      const { notifyUser } = require('../socket');
      notifyUser(userId, result.rows[0]);
    } catch (e) { /* socket not initialized yet */ }
    return result.rows[0];
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  createNotification,
};
