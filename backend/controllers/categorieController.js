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
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;

    const toutesLesCategories = await Categorie.findAll();

    const totalItems = toutesLesCategories.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex   = startIndex + limit;

    const categoriesPagines = toutesLesCategories.slice(startIndex, endIndex);

    res.status(200).json({
      metadata: {
        total_items:       totalItems,
        total_pages:       totalPages,
        current_page:      page,
        per_page:          limit,
        has_next_page:     page < totalPages,
        has_previous_page: page > 1,
      },
      categories: categoriesPagines,
    });
  } catch (error) {
    console.error('Erreur (getAllCategories):', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * @function getCategorieById
 * @description Récupère une catégorie par son identifiant.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getCategorieById = async (req, res) => {
  try {
    const { id } = req.params;
    const categorie = await Categorie.findById(id);

    if (!categorie) {
      return res.status(404).json({ message: 'Catégorie non trouvée.' });
    }

    res.status(200).json(categorie);
  } catch (error) {
    console.error('Erreur (getCategorieById):', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * @function createCategorie
 * @description Crée une nouvelle catégorie.
 * @param {Object} req - Objet de requête Express (body: { nom, description }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.createCategorie = async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: 'Le champ "nom" est obligatoire.' });
    }

    const nouvelleCategorie = await Categorie.create(req.body);
    res.status(201).json(nouvelleCategorie);
  } catch (error) {
    console.error('Erreur (createCategorie):', error);
    res.status(500).json({ message: 'Erreur lors de la création de la catégorie.' });
  }
};

/**
 * @function updateCategorie
 * @description Met à jour une catégorie existante (nom et/ou description).
 * @param {Object} req - Objet de requête Express (params.id, body: { nom, description }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateCategorie = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que la catégorie existe
    const existante = await Categorie.findById(id);
    if (!existante) {
      return res.status(404).json({ message: 'Catégorie non trouvée.' });
    }

    // Fusionner les données existantes avec les nouvelles
    const dataToUpdate = {
      nom:         req.body.nom         ?? existante.nom,
      description: req.body.description ?? existante.description,
    };

    const categorieMisAJour = await Categorie.update(id, dataToUpdate);
    res.status(200).json({
      message:   'Catégorie mise à jour avec succès.',
      categorie: categorieMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateCategorie):', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la catégorie.' });
  }
};

/**
 * @function deleteCategorie
 * @description Supprime une catégorie par son identifiant.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteCategorie = async (req, res) => {
  try {
    const { id } = req.params;

    const estSupprime = await Categorie.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Catégorie non trouvée ou déjà supprimée.' });
    }

    res.status(200).json({ message: 'Catégorie supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteCategorie):', error);
    // Gestion de la contrainte FK (catégorie liée à des produits)
    if (error.code === '23503') {
      return res.status(409).json({
        message: 'Impossible de supprimer : des produits sont encore liés à cette catégorie.',
      });
    }
    res.status(500).json({ message: 'Erreur lors de la suppression de la catégorie.' });
  }
};