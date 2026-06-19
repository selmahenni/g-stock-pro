// backend/routes/entrepotRoutes.js
const express = require('express');
const router = express.Router();
const entrepotController = require('../controllers/entrepotController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Protège toutes les routes de ce fichier (exige un utilisateur connecté)
router.use(verifyToken);

/**
 * @route   GET /api/entrepots
 * @desc    Récupérer tous les entrepôts
 * @access  Super-Admin, Magasinier, Technicien, Consultant
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), entrepotController.getEntrepots);

/**
 * @route   POST /api/entrepots
 * @desc    Créer un nouvel entrepôt
 * @access  Super-Admin, Magasinier
 */
router.post('/', requireRole(['super_admin', 'magasinier']), entrepotController.createEntrepot);

/**
 * @route   PUT /api/entrepots/:id
 * @desc    Mettre à jour un entrepôt existant
 * @access  Super-Admin, Magasinier
 */
router.put('/:id', requireRole(['super_admin', 'magasinier']), entrepotController.updateEntrepot);

/**
 * @route   DELETE /api/entrepots/:id
 * @desc    Supprimer un entrepôt
 * @access  Super-Admin uniquement (interdit au magasinier)
 */
router.delete('/:id', requireRole(['super_admin']), entrepotController.deleteEntrepot);

module.exports = router;