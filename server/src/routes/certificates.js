const express = require('express');
const certificateController = require('../controllers/certificates');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Admin/Organizer generating certificates for attendees
router.post(
  '/generate',
  authenticate,
  requireRole('admin', 'organizer'),
  certificateController.generateCertificates
);

// Template management
router.post(
  '/template',
  authenticate,
  requireRole('admin', 'organizer'),
  certificateController.upload.single('template_image'),
  certificateController.uploadTemplate
);

router.put(
  '/template',
  authenticate,
  requireRole('admin', 'organizer'),
  certificateController.saveTemplateConfig
);

router.get(
  '/template',
  authenticate,
  certificateController.getTemplate
);

// Public route to view/verify a certificate by its UID
router.get('/verify/:uid', certificateController.verifyCertificate);

// Internal route: Users downloading their own generated certificate
router.get('/download/:uid', authenticate, certificateController.downloadCertificate);

// User's own certificates
router.get('/my', authenticate, certificateController.getMyCertificates);

module.exports = router;
