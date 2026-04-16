const express = require('express');
const dashboardController = require('../controllers/dashboard');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', authenticate, requireRole('admin'), dashboardController.getAdminStats);
router.get('/organizer', authenticate, requireRole('admin', 'organizer'), dashboardController.getOrganizerStats);

module.exports = router;
