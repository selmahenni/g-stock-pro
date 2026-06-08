// routes/produitRoutes.js
const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produitController');

/**
 * @route   GET /api/produits
 * @desc    Récupérer tous les produits
 * @access  Public (à sécuriser plus tard avec JWT)
 */
router.get('/', produitController.getAllProduits);

/**
 * @route   GET /api/produits/:id
 * @desc    Récupérer un produit par son ID
 */
router.get('/:id', produitController.getProduitById);

/**
 * @route   POST /api/produits
 * @desc    Créer un nouveau produit
 */
router.post('/', produitController.createProduit);

/**
 * @route   PUT /api/produits/:id
 * @desc    Mettre à jour un produit existant
 */
router.put('/:id', produitController.updateProduit);

/**
 * @route   DELETE /api/produits/:id
 * @desc    Supprimer un produit
 */
router.delete('/:id', produitController.deleteProduit);

module.exports = router;