// backend/routes/utilisateurRoutes.js
const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');

const validate = require('../middlewares/validateMiddleware');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { registerSchema, loginSchema } = require('../validations/utilisateurValidation');

// ==========================================
// 1. Routes d'Authentification (Publiques)
// ==========================================
router.post('/inscription', validate(registerSchema), utilisateurController.createUtilisateur);
router.post('/connexion', validate(loginSchema), utilisateurController.connexion);
router.post('/deconnexion', utilisateurController.deconnexion);

// ==========================================
// 2. Routes Protégées par JWT
// ==========================================
router.use(verifyToken); // Bloque tout ce qui suit si pas de JWT valide

// Route spéciale : permet à l'utilisateur connecté de récupérer son propre profil (tous rôles)
router.get('/me', requireRole(['super_admin', 'magasinier', 'technicien', 'consultant']), (req, res) => {
  return res.status(200).json({
    id: req.utilisateur.id,
    role: req.utilisateur.role,
  });
});

// ==========================================
// 3. Routes de Gestion (Super Admin uniquement)
// ==========================================
router.get('/', requireRole(['super_admin']), utilisateurController.getAllUtilisateurs);
router.get('/:id', requireRole(['super_admin']), utilisateurController.getUtilisateurById);
router.post('/', requireRole(['super_admin']), validate(registerSchema), utilisateurController.createUtilisateur);
router.put('/:id', requireRole(['super_admin']), utilisateurController.updateUtilisateur);
router.patch('/:id/statut', requireRole(['super_admin']), utilisateurController.toggleStatut);
router.delete('/:id', requireRole(['super_admin']), utilisateurController.deleteUtilisateur);

module.exports = router;