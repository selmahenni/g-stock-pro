// routes/produitRoutes.js
const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produitController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// 🛡️ Protège toutes les routes de ce fichier (exige un utilisateur connecté)
router.use(verifyToken);

/**
 * @route   GET /api/produits
 * @desc    Récupérer tous les produits
 * @access  Technicien, Magasinier, Consultant (+ Super-Admin via Pass VIP)
 */
router.get('/', checkRole('super_admin','technicien', 'magasinier', 'consultant'), produitController.getAllProduits);

/**
 * @route   GET /api/produits/:id
 * @desc    Récupérer un produit par son ID
 * @access  Technicien, Magasinier, Consultant
 */
router.get('/:id', checkRole('super_admin','technicien', 'magasinier', 'consultant'), produitController.getProduitById);

/**
 * @route   POST /api/produits
 * @desc    Créer un nouveau produit
 * @access  Magasinier (seul le magasinier gère le catalogue, en plus du Super-Admin)
 */
router.post('/', checkRole('magasinier', 'super_admin'), produitController.createProduit);

/**
 * @route   PUT /api/produits/:id
 * @desc    Mettre à jour un produit existant
 * @access  Magasinier
 */
router.put('/:id', checkRole('super_admin','magasinier'), produitController.updateProduit);

/**
 * @route   DELETE /api/produits/:id
 * @desc    Supprimer un produit
 * @access  Magasinier
 */
router.delete('/:id', checkRole('super_admin','magasinier'), produitController.deleteProduit);

module.exports = router;