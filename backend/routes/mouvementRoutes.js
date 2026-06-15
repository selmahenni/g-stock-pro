// routes/mouvementRoutes.js
const express = require('express');
const router = express.Router();
const mouvementController = require('../controllers/mouvementController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// 🛡️ Application du middleware d'authentification
router.use(verifyToken);

/**
 * @route   GET /api/mouvements
 * @desc    Récupérer l'historique de tous les mouvements (entrées/sorties)
 * @access  Magasinier, Technicien, Consultant (pour lecture/audit)
 */
router.get('/', checkRole('super_admin','magasinier', 'technicien', 'consultant'), mouvementController.getAllMouvements);

/**
 * @route   POST /api/mouvements
 * @desc    Enregistrer un nouveau mouvement
 * @access  Magasinier, Technicien (seuls ces rôles gèrent la manipulation physique)
 */
router.post('/', checkRole('super_admin','magasinier', 'technicien'), mouvementController.createMouvement);

// Note : En général, on ne met pas à jour ni ne supprime un mouvement pour garder une trace d'audit fiable.

module.exports = router;