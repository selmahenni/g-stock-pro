// backend/routes/categorieRoutes.js
const express = require('express');
const router = express.Router();
const categorieController = require('../controllers/categorieController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Protège toutes les routes de ce fichier (exige un utilisateur connecté)
router.use(verifyToken);

/**
 * @route   GET /api/categories
 * @desc    Récupérer toutes les catégories avec pagination
 * @access  Super-Admin, Magasinier, Consultant
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'consultant']), categorieController.getAllCategories);

/**
 * @route   POST /api/categories
 * @desc    Créer une nouvelle catégorie
 * @access  Super-Admin, Magasinier
 */
router.post('/', requireRole(['super_admin', 'magasinier']), categorieController.createCategorie);

/**
 * @route   PUT /api/categories/:id
 * @desc    Mettre à jour une catégorie existante
 * @access  Super-Admin, Magasinier
 */
router.put('/:id', requireRole(['super_admin', 'magasinier']), categorieController.updateCategorie);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Supprimer une catégorie
 * @access  Super-Admin uniquement
 */
router.delete('/:id', requireRole(['super_admin']), categorieController.deleteCategorie);

module.exports = router;