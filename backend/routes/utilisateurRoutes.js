// backend/routes/utilisateurRoutes.js
const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');

// Import des middlewares de sécurité et de validation
const validate = require('../middlewares/validateMiddleware');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Import des schémas de validation Zod
const { registerSchema, loginSchema } = require('../validations/utilisateurValidation');

// ==========================================
// 1. Routes d'Authentification (Publiques)
// ==========================================

/**
 * @route   POST /api/utilisateurs/inscription
 * @desc    Inscription d'un nouvel utilisateur (Vérifié par Zod)
 */
router.post('/inscription', validate(registerSchema), utilisateurController.createUtilisateur);

/**
 * @route   POST /api/utilisateurs/connexion
 * @desc    Connexion de l'utilisateur & création du cookie HTTP-Only (Vérifié par Zod)
 */
router.post('/connexion', validate(loginSchema), utilisateurController.connexion);

/**
 * @route   POST /api/utilisateurs/deconnexion
 * @desc    Déconnexion de l'utilisateur (Suppression du cookie)
 */
router.post('/deconnexion', utilisateurController.deconnexion);


// ==========================================
// 2. Routes de Gestion (Protégées par JWT & Rôles)
// ==========================================

// Ce middleware bloque l'accès à TOUTES les routes définies en dessous si l'utilisateur n'est pas connecté
router.use(verifyToken);

/**
 * @route   GET /api/utilisateurs
 * @desc    Récupérer la liste de tous les utilisateurs (Réservé au Super-Admin)
 */
router.get('/', checkRole('super_admin'), utilisateurController.getAllUtilisateurs);

/**
 * @route   GET /api/utilisateurs/:id
 * @desc    Récupérer un utilisateur par son ID (Réservé au Super-Admin)
 */
router.get('/:id', checkRole('super_admin'), utilisateurController.getUtilisateurById);

/**
 * @route   POST /api/utilisateurs
 * @desc    Créer un nouvel utilisateur depuis le panneau d'administration (Réservé au Super-Admin + Validation Zod)
 */
router.post('/', checkRole('super_admin'), validate(registerSchema), utilisateurController.createUtilisateur);

/**
 * @route   PUT /api/utilisateurs/:id
 * @desc    Mettre à jour les informations d'un utilisateur (Réservé au Super-Admin)
 */
router.put('/:id', checkRole('super_admin'), utilisateurController.updateUtilisateur);

/**
 * @route   DELETE /api/utilisateurs/:id
 * @desc    Supprimer un utilisateur (Réservé au Super-Admin)
 */
router.delete('/:id', checkRole('super_admin'), utilisateurController.deleteUtilisateur);

module.exports = router;