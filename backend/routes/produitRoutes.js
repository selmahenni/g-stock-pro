// routes/produitRoutes.js
const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produitController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Protège toutes les routes de ce fichier (exige un utilisateur connecté)
router.use(verifyToken);

/**
 * @route   GET /api/produits
 * @desc    Récupérer tous les produits
 * @access  Super-Admin, Magasinier, Technicien, Consultant
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), produitController.getAllProduits);

/**
 * @route   GET /api/produits/:id
 * @desc    Récupérer un produit par son ID
 * @access  Super-Admin, Magasinier, Technicien, Consultant
 */
router.get('/:id', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), produitController.getProduitById);

/**
 * @route   POST /api/produits
 * @desc    Créer un nouveau produit
 * @access  Super-Admin, Magasinier
 */
router.post('/', requireRole(['super_admin', 'magasinier']), produitController.createProduit);

/**
 * @route   PUT /api/produits/:id
 * @desc    Mettre à jour un produit existant
 * @access  Super-Admin, Magasinier
 */
router.put('/:id', requireRole(['super_admin', 'magasinier']), produitController.updateProduit);

/**
 * @route   DELETE /api/produits/:id
 * @desc    Supprimer un produit
 * @access  Super-Admin uniquement
 */
router.delete('/:id', requireRole(['super_admin']), produitController.deleteProduit);

module.exports = router;