const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
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
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  authController.login
);

// Google OAuth
router.post('/google', authController.googleCallback);

router.get('/me', authenticate, authController.getMe);

module.exports = router;
