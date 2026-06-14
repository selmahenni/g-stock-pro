// routes/actifRoutes.js
const express = require('express');
const router = express.Router();
const actifController = require('../controllers/actifController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// 🛡️ Application du middleware d'authentification
router.use(verifyToken);

/**
 * @route   GET /api/actifs
 * @desc    Récupérer tout l'inventaire physique
 * @access  Technicien, Magasinier, Consultant
 */
router.get('/', checkRole('technicien', 'magasinier', 'consultant'), actifController.getAllActifs);

/**
 * @route   POST /api/actifs
 * @desc    Enregistrer un nouvel actif matériel
 * @access  Magasinier
 */
router.post('/', checkRole('magasinier'), actifController.createActif);

module.exports = router;