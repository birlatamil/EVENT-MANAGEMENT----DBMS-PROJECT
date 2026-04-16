const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
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

  io.on('connection', (socket) => {
    // Join user's personal room for notifications
    socket.join(`user:${socket.user.id}`);

    // Join event chat room
    socket.on('join-event', (eventId) => {
      socket.join(`event:${eventId}`);
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
