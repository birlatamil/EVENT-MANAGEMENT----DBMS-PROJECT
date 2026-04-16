const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
        if (process.env.NODE_ENV !== 'production' && origin.match(/^http:\/\/localhost:\d+$/)) {
          return callback(null, true);
        }
        if (origin === allowed) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  const pool = require('./config/db');

  io.on('connection', (socket) => {
    // Join user's personal room for notifications
    socket.join(`user:${socket.user.id}`);

    // Join event chat room
    socket.on('join-event', async (eventId) => {
      try {
        if (socket.user.role === 'admin') {
          return socket.join(`event:${eventId}`);
        }

        if (socket.user.role === 'organizer') {
          const evCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
          if (evCheck.rows[0]?.organizer_id === socket.user.id) {
            return socket.join(`event:${eventId}`);
          }
        }

        const regCheck = await pool.query('SELECT id FROM registrations WHERE user_id = $1 AND event_id = $2', [socket.user.id, eventId]);
        if (regCheck.rows.length > 0) {
          socket.join(`event:${eventId}`);
        } else {
          socket.emit('error', { message: 'Unauthorized to join this event channel' });
        }
      } catch (err) {
        console.error('Socket join event error:', err);
      }
    });

    socket.on('leave-event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on('disconnect', () => {
      // cleanup handled automatically
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

// Helper: send notification to a specific user
function notifyUser(userId, notification) {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
}

// Helper: broadcast to all participants of an event
function broadcastToEvent(eventId, event, data) {
  if (io) {
    io.to(`event:${eventId}`).emit(event, data);
  }
}

module.exports = { initSocket, getIO, notifyUser, broadcastToEvent };
