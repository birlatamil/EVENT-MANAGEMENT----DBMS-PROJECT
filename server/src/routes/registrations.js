const express = require('express');
const registrationController = require('../controllers/registrations');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Register for an event
router.post('/register', authenticate, registrationController.registerForEvent);

// List registrations (organizer/admin only)
router.get(
  '/registrations',
  authenticate,
  requireRole('admin', 'organizer'),
  registrationController.getEventRegistrations
);

// Get my registrations
router.get('/my-registrations', authenticate, registrationController.getMyRegistrations);

module.exports = router;
