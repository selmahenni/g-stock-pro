// controllers/stockController.js
const Stock = require('../models/Stock');

/**
 * @function getAllStocks
 * @description Lignes d'inventaire paginées (pagination + recherche côté serveur).
 */
exports.getAllStocks = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const entrepotId = req.query.entrepot_id ? parseInt(req.query.entrepot_id) : null;

    const { rows, total } = await Stock.findPaginated({ page, limit, search, entrepotId });
    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      metadata: {
        total_items:       total,
        total_pages:       totalPages,
        current_page:      page,
        per_page:          limit,
        has_next_page:     page < totalPages,
        has_previous_page: page > 1,
      },
      stocks: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllStocks):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};
