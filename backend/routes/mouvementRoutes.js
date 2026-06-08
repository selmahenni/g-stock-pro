const express = require('express');
const router = express.Router();
const mouvementController = require('../controllers/mouvementController');

/**
 * @route   GET /api/mouvements
 * @desc    Récupérer l'historique de tous les mouvements (entrées/sorties)
 */
router.get('/', mouvementController.getAllMouvements);

/**
 * @route   POST /api/mouvements
 * @desc    Enregistrer un nouveau mouvement
 */
router.post('/', mouvementController.createMouvement);

// Note : En général, on ne met pas à jour ni ne supprime un mouvement pour garder une trace d'audit fiable.

module.exports = router;