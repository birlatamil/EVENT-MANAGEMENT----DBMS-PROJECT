const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const attendanceRoutes = require('./routes/attendance');
const certificateRoutes = require('./routes/certificates');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const otpRoutes = require('./routes/otp');
const chatRoutes = require('./routes/chat');
const { initSocket } = require('./socket');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', registrationRoutes); // 'my-registrations' route
app.use('/api/events/:id', registrationRoutes); // nested event routes
app.use('/api/events/:id/attendance', attendanceRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/events/:id/certificates', certificateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events/:id/otp', otpRoutes);
app.use('/api/events/:id/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
