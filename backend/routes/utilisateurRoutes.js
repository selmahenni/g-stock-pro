// backend/routes/utilisateurRoutes.js
const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');

const validate = require('../middlewares/validateMiddleware');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const { registerSchema, loginSchema } = require('../validations/utilisateurValidation');

// ==========================================
// 1. Routes d'Authentification (Publiques)
// ==========================================
router.post('/inscription', validate(registerSchema), utilisateurController.createUtilisateur);
router.post('/connexion', validate(loginSchema), utilisateurController.connexion);
router.post('/deconnexion', utilisateurController.deconnexion);

// ==========================================
// 2. Routes de Gestion (Protégées par JWT & Rôles)
// ==========================================
router.use(verifyToken); // Bloque tout ce qui suit si pas de JWT valide

router.get('/', checkRole('super_admin'), utilisateurController.getAllUtilisateurs);
router.get('/:id', checkRole('super_admin'), utilisateurController.getUtilisateurById);
router.post('/', checkRole('super_admin'), validate(registerSchema), utilisateurController.createUtilisateur);
router.put('/:id', checkRole('super_admin'), utilisateurController.updateUtilisateur);
router.delete('/:id', checkRole('super_admin'), utilisateurController.deleteUtilisateur);

// C'EST CETTE LIGNE QUI MANQUAIT OU ÉTAIT ÉCRASÉE
module.exports = router;