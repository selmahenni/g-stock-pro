// backend/routes/fournisseurRoutes.js
const express = require('express');
const router = express.Router();
const fournisseurController = require('../controllers/fournisseurController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Protège toutes les routes de ce fichier (exige un utilisateur connecté)
router.use(verifyToken);

/**
 * @route   GET /api/fournisseurs
 * @desc    Récupérer tous les fournisseurs avec pagination
 * @access  Super-Admin, Magasinier, Consultant
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'consultant']), fournisseurController.getAllFournisseurs);

/**
 * @route   POST /api/fournisseurs
 * @desc    Créer un nouveau fournisseur
 * @access  Super-Admin, Magasinier
 */
router.post('/', requireRole(['super_admin', 'magasinier']), fournisseurController.createFournisseur);

/**
 * @route   PUT /api/fournisseurs/:id
 * @desc    Mettre à jour un fournisseur existant
 * @access  Super-Admin, Magasinier
 */
router.put('/:id', requireRole(['super_admin', 'magasinier']), fournisseurController.updateFournisseur);

/**
 * @route   DELETE /api/fournisseurs/:id
 * @desc    Supprimer un fournisseur
 * @access  Super-Admin uniquement (interdit au magasinier)
 */
router.delete('/:id', requireRole(['super_admin']), fournisseurController.deleteFournisseur);

module.exports = router;