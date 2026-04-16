const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const eventController = require('../controllers/events');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);

// Protected routes (Organizers and Admins only)
router.post(
  '/',
  authenticate,
  requireRole('admin', 'organizer'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().trim(),
    body('event_date').isISO8601().toDate().withMessage('Valid date is required'),
    body('venue').trim().notEmpty().withMessage('Venue is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  ],
  handleValidation,
  eventController.createEvent
);

router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'organizer'),
  [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('event_date').optional().isISO8601().toDate(),
    body('venue').optional().trim().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']),
  ],
  handleValidation,
  eventController.updateEvent
);

// Change event status (start / end / cancel)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'organizer'),
  [
    body('status').isIn(['upcoming', 'ongoing', 'completed', 'cancelled']).withMessage('Invalid status'),
  ],
  handleValidation,
  eventController.changeEventStatus
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'organizer'),
  eventController.deleteEvent
);

module.exports = router;
