// routes/mouvementRoutes.js
const express = require('express');
const router = express.Router();
const mouvementController = require('../controllers/mouvementController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Application du middleware d'authentification
router.use(verifyToken);

/**
 * @route   GET /api/mouvements
 * @desc    Récupérer l'historique de tous les mouvements (entrées/sorties)
 * @access  Super-Admin, Magasinier, Consultant (pour lecture/audit)
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'consultant']), mouvementController.getAllMouvements);

/**
 * @route   POST /api/mouvements
 * @desc    Enregistrer un nouveau mouvement
 * @access  Super-Admin, Magasinier
 */
router.post('/', requireRole(['super_admin', 'magasinier']), mouvementController.createMouvement);

/**
 * @route   PUT /api/mouvements/:id
 * @desc    Modifier un mouvement existant
 * @access  Super-Admin, Magasinier
 */
router.put('/:id', requireRole(['super_admin', 'magasinier']), mouvementController.updateMouvement);

/**
 * @route   DELETE /api/mouvements/:id
 * @desc    Supprimer un mouvement
 * @access  Super-Admin uniquement
 */
router.delete('/:id', requireRole(['super_admin']), mouvementController.deleteMouvement);

module.exports = router;