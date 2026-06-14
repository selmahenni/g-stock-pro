// controllers/categorieController.js
const Categorie = require('../models/Categorie');

/**
 * @function getAllCategories
 * @description Récupère la liste de toutes les catégories avec pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllCategories = async (req, res) => {
  try {
    // 1. Paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 2. Récupération des données brutes depuis le modèle
    const toutesLesCategories = await Categorie.findAll();

    // 3. Calcul de la pagination "en mémoire"
    const totalItems = toutesLesCategories.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Découpage du tableau
    const categoriesPagines = toutesLesCategories.slice(startIndex, endIndex);

    // 4. Réponse structurée
    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      categories: categoriesPagines
    });
  } catch (error) { 
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ message: 'Erreur serveur' }); 
  }
};

/**
 * @function createCategorie
 * @description Crée une nouvelle catégorie.
 */
exports.createCategorie = async (req, res) => {
  try {
    const nouvelleCategorie = await Categorie.create(req.body);
    res.status(201).json(nouvelleCategorie);
  } catch (error) { 
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ message: 'Erreur de création' }); 
  }
};

// Logique identique pour getById, update, et delete (en adaptant l'appel au modèle)