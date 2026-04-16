const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['participant', 'organizer']).withMessage('Invalid role'),
  ],
  handleValidation,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  authController.login
);

// Google OAuth
router.post('/google', authLimiter, authController.googleCallback);

router.get('/me', authenticate, authController.getMe);

module.exports = router;
