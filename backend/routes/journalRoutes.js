// routes/journalRoutes.js
const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journalController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

/**
 * @route  GET /api/journaux
 * @desc   Journal de sécurité (audit) — lecture seule
 * @access Super-Admin uniquement
 */
router.get('/', requireRole(['super_admin']), journalController.getAllJournaux);

module.exports = router;
