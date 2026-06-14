// controllers/actifController.js
const Actif = require('../models/Actif');

/**
 * @function getAllActifs
 * @description Récupère tout l'inventaire physique avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllActifs = async (req, res) => {
  try {
    // 1. Paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 2. Récupération des données brutes
    const tousLesActifs = await Actif.findAll();

    // 3. Calcul de la pagination
    const totalItems = tousLesActifs.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    // Découpage du tableau
    const actifsPagines = tousLesActifs.slice(startIndex, endIndex);

    // 4. Réponse
    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      actifs: actifsPagines
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des actifs:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function createActif
 * @description Enregistre un nouveau matériel dans le parc.
 */
exports.createActif = async (req, res) => {
  try {
    const { produit_id, numero_serie, entrepot_id } = req.body;
    
    // Validation basique
    if (!produit_id || !numero_serie || !entrepot_id) {
      return res.status(400).json({ 
        message: 'produit_id, numero_serie et entrepot_id sont obligatoires.' 
      });
    }

    const nouvelActif = await Actif.create(req.body);
    res.status(201).json({
      message: 'Actif enregistré avec succès',
      actif: nouvelActif
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'actif:', error);
    // Gestion du cas où le numéro de série existe déjà (erreur PostgreSQL 23505)
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce numéro de série existe déjà dans le système.' });
    }
    res.status(500).json({ message: 'Erreur lors de la création' });
  }
};