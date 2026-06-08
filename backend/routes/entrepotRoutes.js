const express = require('express');
const router = express.Router();
const entrepotController = require('../controllers/entrepotController');

/**
 * @route   GET /api/entrepots
 * @desc    Récupérer tous les entrepôts
 */
router.get('/', entrepotController.getEntrepots);

/**
 * @route   POST /api/entrepots
 * @desc    Créer un nouvel entrepôt
 */
router.post('/', entrepotController.createEntrepot);

module.exports = router;