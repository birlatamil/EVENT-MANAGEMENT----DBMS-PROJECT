const express = require('express');
const notifController = require('../controllers/notifications');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, notifController.getNotifications);
router.get('/unread-count', authenticate, notifController.getUnreadCount);
router.put('/read-all', authenticate, notifController.markAllRead);
router.put('/:id/read', authenticate, notifController.markAsRead);

module.exports = router;
