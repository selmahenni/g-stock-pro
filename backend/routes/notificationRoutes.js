// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// 🛡️ Toutes les routes exigent un utilisateur connecté
router.use(verifyToken);

/**
 * @route  GET /api/notifications
 * @desc   Notifications de l'utilisateur connecté (+ compteur non lues)
 * @access Tout utilisateur authentifié
 */
router.get('/', notificationController.getMesNotifications);

/**
 * @route  PATCH /api/notifications/tout-lu
 * @desc   Marquer toutes ses notifications comme lues
 */
router.patch('/tout-lu', notificationController.marquerToutLu);

/**
 * @route  PATCH /api/notifications/:id/lu
 * @desc   Marquer une notification comme lue
 */
router.patch('/:id/lu', notificationController.marquerLue);

module.exports = router;
