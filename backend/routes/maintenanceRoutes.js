// routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController'); // Assure-toi que ce contrôleur existe
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// 🛡️ Application du middleware d'authentification
router.use(verifyToken);

/**
 * @route   GET /api/maintenances
 * @desc    Récupérer l'historique des maintenances
 * @access  Technicien, Magasinier, Consultant
 */
router.get('/', checkRole('technicien', 'magasinier', 'consultant'), maintenanceController.getAllMaintenances);

/**
 * @route   POST /api/maintenances
 * @desc    Enregistrer un nouveau rapport de maintenance
 * @access  Technicien (Réservé au rôle technique)
 */
router.post('/', checkRole('super_admin','technicien'), maintenanceController.createMaintenance);

/**
 * @route   GET /api/maintenances/:id
 * @desc    Voir les détails d'un rapport spécifique
 * @access  Technicien, Magasinier, Consultant
 */
router.get('/:id', checkRole('super_admin','technicien', 'magasinier', 'consultant'), maintenanceController.getMaintenanceById);

module.exports = router;