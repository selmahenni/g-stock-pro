// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

/**
 * @route  GET /api/dashboard/stats
 * @desc   Agrégats du tableau de bord
 * @access Tout utilisateur authentifié
 */
router.get('/stats', dashboardController.getStats);

module.exports = router;
