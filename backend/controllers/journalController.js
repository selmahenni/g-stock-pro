// controllers/journalController.js
const Journal = require('../models/Journal');

/**
 * @function getAllJournaux
 * @description Liste paginée du journal de sécurité (lecture seule, super-admin).
 */
exports.getAllJournaux = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || '').trim();

    const { rows, total } = await Journal.findPaginated({ page, limit, search });
    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      metadata: {
        total_items: total,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
      journaux: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllJournaux):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};
