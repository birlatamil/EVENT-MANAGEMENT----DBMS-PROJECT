const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const attendanceController = require('../controllers/attendance');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Mark attendance via QR token scan
router.post(
  '/mark',
  authenticate,
  requireRole('admin', 'organizer'),
  [
    body('qr_token').isUUID().withMessage('Valid QR token is required'),
    body('event_id').isInt().withMessage('Event ID is required'),
  ],
  handleValidation,
  attendanceController.markAttendance
);

router.get(
  '/export',
  authenticate,
  requireRole('admin', 'organizer'),
  attendanceController.exportAttendanceCSV
);

module.exports = router;
