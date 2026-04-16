const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const otpController = require('../controllers/otp');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Admin opens OTP session
router.post('/open', authenticate, requireRole('admin', 'organizer'), otpController.openOTPSession);

// Admin closes OTP session
router.post('/close', authenticate, requireRole('admin', 'organizer'), otpController.closeOTPSession);

// Get status (both admin and participant)
router.get('/status', authenticate, otpController.getOTPStatus);

// Participant verifies OTP
router.post(
  '/verify',
  authenticate,
  [body('otp_code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')],
  handleValidation,
  otpController.verifyOTP
);

module.exports = router;
