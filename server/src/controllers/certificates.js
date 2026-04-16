const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const { createNotification } = require('./notifications');

// Multer config for certificate template uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `template_${req.params.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PNG, JPG, and WebP images are allowed'));
  },
});

// Upload certificate template image
async function uploadTemplate(req, res) {
  const { id: eventId } = req.params;

  try {
    const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });

    const imagePath = req.file.path;

    // Upsert template record
    await pool.query(
      `INSERT INTO certificate_templates (event_id, image_path)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO UPDATE SET image_path = $2, updated_at = NOW()`,
      [eventId, imagePath]
    );

    res.json({
      message: 'Template uploaded successfully.',
      image_url: `/uploads/certificates/${req.file.filename}`,
    });
  } catch (error) {
    console.error('Upload template error:', error);
    res.status(500).json({ error: 'Server error uploading template.' });
  }
}

// Save template name region config
async function saveTemplateConfig(req, res) {
  const { id: eventId } = req.params;
  const { name_x, name_y, name_width, name_height, font_size, font_color, font_family } = req.body;

  try {
    const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    if (req.user.role !== 'admin' && eventCheck.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const result = await pool.query(
      `UPDATE certificate_templates
       SET name_x = COALESCE($2, name_x),
           name_y = COALESCE($3, name_y),
           name_width = COALESCE($4, name_width),
           name_height = COALESCE($5, name_height),
           font_size = COALESCE($6, font_size),
           font_color = COALESCE($7, font_color),
           font_family = COALESCE($8, font_family),
           updated_at = NOW()
       WHERE event_id = $1
       RETURNING *`,
      [eventId, name_x, name_y, name_width, name_height, font_size, font_color, font_family]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found. Upload an image first.' });
    }

    res.json({ message: 'Template config saved.', template: result.rows[0] });
  } catch (error) {
    console.error('Save template config error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

// Get template info
async function getTemplate(req, res) {
  const { id: eventId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM certificate_templates WHERE event_id = $1', [eventId]);
    if (result.rows.length === 0) {
      return res.json({ template: null });
    }

    const template = result.rows[0];
    // Convert absolute path to relative URL
    const filename = path.basename(template.image_path);
    template.image_url = `/uploads/certificates/${filename}`;

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

async function generateCertificates(req, res) {
  const { id: eventId } = req.params;

  try {
    // Check ownership
    const eventCheck = await pool.query('SELECT title, event_date, organizer_id FROM events WHERE id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const event = eventCheck.rows[0];
    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to generate certificates for this event.' });
    }

    // Find all attendees who don't have a certificate yet
    const query = `
      SELECT a.registration_id, r.user_id
      FROM attendance a
      JOIN registrations r ON a.registration_id = r.id
      LEFT JOIN certificates c ON r.id = c.registration_id
      WHERE r.event_id = $1 AND c.id IS NULL
    `;

    const attendees = await pool.query(query, [eventId]);

    if (attendees.rows.length === 0) {
      return res.json({ message: 'No new certificates needed. All attendees already have one.' });
    }

    // Generate certificates records in DB
    const insertValues = attendees.rows.map((row, index) => `($${index + 1})`).join(', ');
    const params = attendees.rows.map(row => row.registration_id);

    const insertQuery = `
      INSERT INTO certificates (registration_id)
      VALUES ${insertValues}
      RETURNING id, certificate_uid, registration_id
    `;

    const generated = await pool.query(insertQuery, params);

    // Send notification to each participant
    for (const cert of generated.rows) {
      const attendee = attendees.rows.find(a => a.registration_id === cert.registration_id);
      if (attendee) {
        await createNotification(
          attendee.user_id,
          parseInt(eventId),
          'certificate_issued',
          'Certificate Issued! 🎓',
          `Your certificate for "${event.title}" has been generated. You can download it from the event page.`
        );
      }
    }

    res.json({
      message: `Generated ${generated.rows.length} certificates successfully.`
    });

  } catch (error) {
    console.error('Generate certificates error:', error);
    res.status(500).json({ error: 'Server error generating certificates.' });
  }
}

async function verifyCertificate(req, res) {
  const { uid } = req.params;

  try {
    const query = `
      SELECT c.certificate_uid, c.issued_at,
             u.name as participant_name,
             e.title as event_title, e.event_date
      FROM certificates c
      JOIN registrations r ON c.registration_id = r.id
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      WHERE c.certificate_uid = $1
    `;

    const result = await pool.query(query, [uid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, error: 'Certificate not found or invalid.' });
    }

    res.json({
      valid: true,
      certificate: result.rows[0]
    });

  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Server error verifying certificate.' });
  }
}

async function downloadCertificate(req, res) {
  const { uid } = req.params;

  try {
    // Fetch certificate details
    const query = `
      SELECT c.certificate_uid, c.issued_at,
             u.id as user_id, u.name as participant_name,
             e.id as event_id, e.title as event_title, e.event_date
      FROM certificates c
      JOIN registrations r ON c.registration_id = r.id
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      WHERE c.certificate_uid = $1
    `;

    const result = await pool.query(query, [uid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const data = result.rows[0];

    // Access check: only the owner or an admin/organizer can download it
    if (req.user.role === 'participant' && data.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to download this certificate.' });
    }

    // Check if there's a custom template
    const templateResult = await pool.query(
      'SELECT * FROM certificate_templates WHERE event_id = $1',
      [data.event_id]
    );

    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${data.certificate_uid}`;

    if (templateResult.rows.length > 0 && fs.existsSync(templateResult.rows[0].image_path)) {
      // Custom template — overlay name on image, output as PDF
      const template = templateResult.rows[0];

      // Create SVG text overlay
      const fontSize = template.font_size || 36;
      const fontColor = template.font_color || '#000000';
      const nameX = template.name_x || 50;
      const nameY = template.name_y || 50;
      const nameW = template.name_width || 400;
      const nameH = template.name_height || 60;

      // Get image dimensions
      const metadata = await sharp(template.image_path).metadata();
      const imgWidth = metadata.width;
      const imgHeight = metadata.height;

      // Create SVG overlay with participant name
      const svgText = `
        <svg width="${imgWidth}" height="${imgHeight}">
          <text
            x="${nameX + nameW / 2}"
            y="${nameY + nameH / 2 + fontSize / 3}"
            font-size="${fontSize}"
            fill="${fontColor}"
            font-family="Arial, sans-serif"
            font-weight="bold"
            text-anchor="middle"
            dominant-baseline="middle"
          >${data.participant_name}</text>
        </svg>
      `;

      const compositeImage = await sharp(template.image_path)
        .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
        .png()
        .toBuffer();

      // Generate PDF with image
      const doc = new PDFDocument({
        size: [imgWidth, imgHeight],
        margin: 0,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Certificate_${data.participant_name.replace(/\s+/g, '_')}.pdf`);
      doc.pipe(res);

      doc.image(compositeImage, 0, 0, { width: imgWidth, height: imgHeight });

      // QR code in bottom-right
      const qrDataUrl = await qrcode.toDataURL(verificationUrl, { width: 80, margin: 1 });
      doc.image(qrDataUrl, imgWidth - 100, imgHeight - 100, { width: 80 });

      doc.end();
    } else {
      // Default template (original behavior)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Certificate_${data.participant_name.replace(/\s+/g, '_')}.pdf`);

      doc.pipe(res);

      // Styling the PDF
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke(); // Border

      doc.fontSize(40).font('Helvetica-Bold')
         .text('Certificate of Attendance', { align: 'center', margin: 100 })
         .moveDown(1);

      doc.fontSize(20).font('Helvetica')
         .text('This is to certify that', { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(30).font('Helvetica-Bold').fillColor('#1a56db')
         .text(data.participant_name, { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(20).font('Helvetica').fillColor('black')
         .text('has successfully attended', { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(25).font('Helvetica-Bold')
         .text(data.event_title, { align: 'center' })
         .moveDown(1);

      doc.fontSize(16).font('Helvetica')
         .text(`Date: ${new Date(data.event_date).toLocaleDateString()}`, { align: 'center' })
         .moveDown(2);

      // Add QR code for verification
      const qrDataUrl = await qrcode.toDataURL(verificationUrl, { width: 100, margin: 1 });
      const qrX = (doc.page.width - 100) / 2;
      doc.image(qrDataUrl, qrX, doc.page.height - 180, { width: 100 });

      doc.fontSize(10).text(`UID: ${data.certificate_uid}`, 0, doc.page.height - 70, { align: 'center' });

      doc.end();
    }

  } catch (error) {
    console.error('Download certificate error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error generating PDF.' });
    }
  }
}

// Get user's certificates
async function getMyCertificates(req, res) {
  try {
    const userId = req.user.id;
    const query = `
      SELECT c.certificate_uid, c.issued_at,
             e.id as event_id, e.title as event_title, e.event_date
      FROM certificates c
      JOIN registrations r ON c.registration_id = r.id
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      WHERE u.id = $1
      ORDER BY c.issued_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json({ certificates: result.rows });
  } catch (error) {
    console.error('Get my certificates error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = {
  generateCertificates,
  verifyCertificate,
  downloadCertificate,
  uploadTemplate,
  saveTemplateConfig,
  getTemplate,
  getMyCertificates,
  upload,
};
