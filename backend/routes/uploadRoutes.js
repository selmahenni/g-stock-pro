// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Dossier de destination des images téléversées
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Stockage disque avec nom de fichier unique et extension d'origine
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, '_')
      .slice(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

// On n'accepte que les images, taille max 5 Mo
const TYPES_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (TYPES_AUTORISES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Format non supporté. Images uniquement (JPEG, PNG, WEBP, GIF, SVG).'));
  },
});

/**
 * @route  POST /api/uploads/image
 * @desc   Téléverse une image et renvoie son URL publique
 * @access Super-Admin, Magasinier
 */
router.post(
  '/image',
  verifyToken,
  requireRole(['super_admin', 'magasinier']),
  (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'Fichier trop volumineux (max 5 Mo).'
          : err.message || 'Échec du téléversement.';
        return res.status(400).json({ message });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu (champ "image").' });
      }
      const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      res.status(201).json({ url, filename: req.file.filename });
    });
  }
);

module.exports = router;
