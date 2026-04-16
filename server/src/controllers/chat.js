const pool = require('../config/db');

async function getMessages(req, res) {
  const { id: eventId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Verify user is registered or is organizer
    const event = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });

    const isOrganizer = req.user.role === 'admin' || event.rows[0].organizer_id === req.user.id;

    if (!isOrganizer) {
      const reg = await pool.query(
        'SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2',
        [eventId, req.user.id]
      );
      if (reg.rows.length === 0) {
        return res.status(403).json({ error: 'You must be registered to view the chat.' });
      }
    }

    const result = await pool.query(
      `SELECT cm.*, u.name as sender_name, u.role as sender_role
       FROM chat_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.event_id = $1
       ORDER BY cm.created_at ASC
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error fetching messages.' });
  }
}

async function sendMessage(req, res) {
  const { id: eventId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // Verify user is registered or organizer
    const event = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });

    const isOrganizer = req.user.role === 'admin' || event.rows[0].organizer_id === req.user.id;

    if (!isOrganizer) {
      const reg = await pool.query(
        'SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );
      if (reg.rows.length === 0) {
        return res.status(403).json({ error: 'You must be registered to chat.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (event_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [eventId, userId, content.trim()]
    );

    // Get sender info
    const userResult = await pool.query('SELECT name, role FROM users WHERE id = $1', [userId]);
    const message = {
      ...result.rows[0],
      sender_name: userResult.rows[0].name,
      sender_role: userResult.rows[0].role,
    };

    // Broadcast via Socket.IO
    try {
      const { broadcastToEvent } = require('../socket');
      broadcastToEvent(eventId, 'chat-message', message);
    } catch (e) { /* socket not initialized */ }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error sending message.' });
  }
}

module.exports = { getMessages, sendMessage };
