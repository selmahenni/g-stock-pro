// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

/**
 * @route  GET /api/stocks
 * @desc   Lignes d'inventaire paginées
 * @access Super-Admin, Magasinier, Consultant
 */
router.get('/', requireRole(['super_admin', 'magasinier', 'consultant']), stockController.getAllStocks);

module.exports = router;
