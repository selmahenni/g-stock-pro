const express = require('express');
const router = express.Router();
const actifController = require('../controllers/actifController');

/**
 * @route   GET /api/actifs
 * @desc    Récupérer tout l'inventaire physique
 */
router.get('/', actifController.getAllActifs);

/**
 * @route   POST /api/actifs
 * @desc    Enregistrer un nouvel actif matériel
 */
router.post('/', actifController.createActif);

module.exports = router;