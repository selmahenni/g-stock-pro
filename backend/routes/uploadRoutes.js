// routes/uploadRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { supabase, bucket, estConfigure } = require('../config/supabase');

const router = express.Router();

// Dossier de repli LOCAL (utilisé uniquement si Supabase Storage n'est pas configuré).
// process.cwd() au lieu de __dirname : reste défini même si le backend est empaqueté
// en ESM (ex. @vercel/node sur Vercel, où __dirname n'existe pas). En local (process
// lancé depuis /backend) le chemin résolu est identique.
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// On garde l'image EN MÉMOIRE : on l'envoie ensuite vers Supabase (ou on l'écrit en repli).
const TYPES_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (TYPES_AUTORISES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Format non supporté. Images uniquement (JPEG, PNG, WEBP, GIF, SVG).'));
  },
});

/** Nom de fichier unique et sûr, dérivé du nom d'origine. */
function nomFichier(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const base = path.basename(originalname, ext).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
  return `${Date.now()}-${base}${ext}`;
}

/**
 * @route  POST /api/uploads/image
 * @desc   Téléverse une image (Supabase Storage si configuré, sinon /uploads local) et renvoie son URL publique
 * @access Super-Admin, Magasinier
 */
router.post(
  '/image',
  verifyToken,
  requireRole(['super_admin', 'magasinier']),
  (req, res) => {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'Fichier trop volumineux (max 5 Mo).'
          : err.message || 'Échec du téléversement.';
        return res.status(400).json({ message });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier reçu (champ "image").' });
      }

      const filename = nomFichier(req.file.originalname);

      try {
        // ── Cas 1 : Supabase Storage ──
        if (estConfigure) {
          const chemin = `produits/${filename}`; // arborescence logique dans le bucket
          const { error } = await supabase.storage
            .from(bucket)
            .upload(chemin, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
          if (error) throw error;

          const { data } = supabase.storage.from(bucket).getPublicUrl(chemin);
          return res.status(201).json({ url: data.publicUrl, filename, storage: 'supabase' });
        }

        // ── Cas 2 : repli LOCAL (Supabase non configuré) ──
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
        const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        return res.status(201).json({ url, filename, storage: 'local' });
      } catch (e) {
        console.error('❌ Upload image échoué:', e.message);
        return res.status(500).json({ message: 'Échec du téléversement de l\'image vers le stockage.' });
      }
    });
  }
);

module.exports = router;
