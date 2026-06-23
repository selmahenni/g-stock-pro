// routes/maintenanceRoutes.js
const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Application du middleware d'authentification
router.use(verifyToken);

/**
 * @route   GET /api/maintenances
 * @desc    Récupérer l'historique des maintenances
 * @access  Super-Admin, Technicien, Consultant
 */
router.get('/', requireRole(['super_admin', 'technicien', 'consultant']), maintenanceController.getAllMaintenances);

/**
 * @route   GET /api/maintenances/echeancier
 * @desc    Échéancier préventif calculé côté serveur (top N échéances + totaux)
 * @access  Super-Admin, Technicien, Consultant
 * @note    Déclaré AVANT /:id pour ne pas être capturé comme paramètre.
 */
router.get('/echeancier', requireRole(['super_admin', 'technicien', 'consultant']), maintenanceController.getEcheancier);

/**
 * @route   GET /api/maintenances/:id
 * @desc    Voir les détails d'un ticket spécifique
 * @access  Super-Admin, Technicien, Consultant
 */
router.get('/:id', requireRole(['super_admin', 'technicien', 'consultant']), maintenanceController.getMaintenanceById);

/**
 * @route   PUT /api/maintenances/:id
 * @desc    Mettre à jour un ticket de maintenance
 * @access  Super-Admin, Technicien
 * @note    La création de tickets se fait via les actions sur l'actif
 *          (POST /api/actifs/:id/panne et /api/actifs/:id/entretien).
 */
router.put('/:id', requireRole(['super_admin', 'technicien']), maintenanceController.updateMaintenance);

/**
 * @route   DELETE /api/maintenances/:id
 * @desc    Supprimer un rapport de maintenance
 * @access  Super-Admin uniquement
 */
router.delete('/:id', requireRole(['super_admin']), maintenanceController.deleteMaintenance);

module.exports = router;