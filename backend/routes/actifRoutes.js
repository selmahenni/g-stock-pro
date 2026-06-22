// routes/actifRoutes.js
const express = require('express');
const router = express.Router();
const actifController = require('../controllers/actifController');
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🛡️ Application du middleware d'authentification
router.use(verifyToken);

/**
 * @route   GET /api/actifs
 * @desc    Récupérer tout l'inventaire physique
 * @access  Super-Admin, Magasinier, Technicien, Consultant
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), actifController.getAllActifs);

/**
 * @route   GET /api/actifs/:id
 * @desc    Récupérer un actif par son ID
 * @access  Super-Admin, Magasinier, Technicien, Consultant
 */
router.get('/:id', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), actifController.getActifById);

/**
 * @route   POST /api/actifs
 * @desc    Enregistrer un nouvel actif matériel
 * @access  Super-Admin, Magasinier, Technicien
 */
router.post('/', requireRole(['super_admin', 'magasinier', 'technicien']), actifController.createActif);

/**
 * @route   POST /api/actifs/batch
 * @desc    Enregistrer plusieurs actifs en lot (transaction atomique)
 * @access  Super-Admin, Magasinier, Technicien
 */
router.post('/batch', requireRole(['super_admin', 'magasinier', 'technicien']), actifController.createActifsBatch);

/**
 * @route   PUT /api/actifs/:id
 * @desc    Mettre à jour un actif (statut, affectation, etc.)
 * @access  Super-Admin, Magasinier, Technicien (le technicien peut modifier le statut)
 */
router.put('/:id', requireRole(['super_admin', 'magasinier', 'technicien']), actifController.updateActif);

/**
 * @route   DELETE /api/actifs/:id
 * @desc    Supprimer un actif
 * @access  Super-Admin uniquement
 */
router.delete('/:id', requireRole(['super_admin']), actifController.deleteActif);

// ==========================================
// Maintenance (V2) — exécution sur l'actif unitaire
// ==========================================

/**
 * @route   GET /api/actifs/:id/maintenances
 * @desc    Historique de maintenance d'un actif
 * @access  Super-Admin, Magasinier, Technicien, Consultant
 */
router.get('/:id/maintenances', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), maintenanceController.getMaintenancesByActif);

/**
 * @route   POST /api/actifs/:id/panne
 * @desc    Déclarer une panne (maintenance curative) sur un actif
 * @access  Super-Admin, Magasinier, Technicien
 */
router.post('/:id/panne', requireRole(['super_admin', 'magasinier', 'technicien']), maintenanceController.declarerPanne);

/**
 * @route   POST /api/actifs/:id/entretien
 * @desc    Enregistrer un entretien terminé (préventif/curatif) sur un actif
 * @access  Super-Admin, Technicien
 */
router.post('/:id/entretien', requireRole(['super_admin', 'technicien']), maintenanceController.enregistrerEntretien);

module.exports = router;