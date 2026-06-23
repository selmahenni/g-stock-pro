// routes/bonSortieRoutes.js
const express = require('express');
const router = express.Router();
const bonSortieController = require('../controllers/bonSortieController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Authentification requise pour toutes les routes
router.use(verifyToken);

/**
 * @route   GET /api/bons-sortie
 * @desc    Historique paginé des bons de sortie
 * @access  Super-Admin, Magasinier, Consultant (lecture/audit)
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'consultant']), bonSortieController.getAllBonsSortie);

/**
 * @route   GET /api/bons-sortie/:id
 * @desc    Détail d'un bon de sortie (avec ses lignes)
 * @access  Super-Admin, Magasinier, Consultant
 */
router.get('/:id', requireRole(['super_admin', 'magasinier', 'consultant']), bonSortieController.getBonSortieById);

/**
 * @route   POST /api/bons-sortie
 * @desc    Créer un bon de sortie (sortie de plusieurs actifs en une fois)
 * @access  Super-Admin, Magasinier
 */
router.post('/', requireRole(['super_admin', 'magasinier']), bonSortieController.createBonSortie);

/**
 * @route   DELETE /api/bons-sortie/:id
 * @desc    Supprimer l'en-tête d'un bon de sortie (mouvements conservés)
 * @access  Super-Admin uniquement
 */
router.delete('/:id', requireRole(['super_admin']), bonSortieController.deleteBonSortie);

module.exports = router;
