// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 🛡️ Toutes les routes de messagerie exigent un utilisateur connecté.
// (Pas de restriction de rôle : la messagerie est ouverte à tous les rôles,
//  contrairement aux notifications qui suivent des règles de ciblage strictes.)
router.use(verifyToken);

/**
 * @route GET /api/messages           → boîte de réception (+ compteur non lus)
 * @route GET /api/messages/envoyes   → messages envoyés
 * @route GET /api/messages/annuaire  → utilisateurs (destinataires internes possibles)
 * @route POST /api/messages          → envoyer (interne ou externe)
 * @route PATCH /api/messages/:id/lu  → marquer un message reçu comme lu
 */
router.get('/', messageController.getBoiteReception);
router.get('/non-lus', messageController.getNonLus);
router.get('/envoyes', messageController.getEnvoyes);
router.get('/annuaire', messageController.getAnnuaire);
router.post('/', messageController.envoyer);
router.patch('/:id/lu', messageController.marquerLu);

module.exports = router;
