const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const chatController = require('../controllers/chat');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, chatController.getMessages);

router.post(
  '/',
  authenticate,
  [body('content').trim().notEmpty().withMessage('Message content is required')],
  handleValidation,
  chatController.sendMessage
);

module.exports = router;
