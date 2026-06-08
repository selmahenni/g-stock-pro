const express = require('express');
const router = express.Router();
const fournisseurController = require('../controllers/fournisseurController');

/**
 * @route   GET /api/fournisseurs
 * @desc    Récupérer tous les fournisseurs
 */
router.get('/', fournisseurController.getAllFournisseurs);

/**
 * @route   POST /api/fournisseurs
 * @desc    Créer un nouveau fournisseur
 */
router.post('/', fournisseurController.createFournisseur);

module.exports = router;