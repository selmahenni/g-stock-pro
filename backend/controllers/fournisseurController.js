// controllers/fournisseursController.js
const Fournisseur = require('../models/Fournisseur');

/**
 * @function getAllFournisseurs
 * @description Récupère la liste des fournisseurs avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllFournisseurs = async (req, res) => {
  try {
    // 1. Paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 2. Extraction complète depuis le modèle
    const tousLesFournisseurs = await Fournisseur.findAll();

    // 3. Application de la pagination "en mémoire"
    const totalItems = tousLesFournisseurs.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const fournisseursPagines = tousLesFournisseurs.slice(startIndex, endIndex);

    // 4. Envoi au client avec métadonnées
    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      fournisseurs: fournisseursPagines
    });
  } catch (error) { 
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    res.status(500).json({ message: 'Erreur serveur' }); 
  }
};

/**
 * @function createFournisseur
 * @description Enregistre un nouveau fournisseur.
 */
exports.createFournisseur = async (req, res) => {
  try {
    const nouveau = await Fournisseur.create(req.body);
    res.status(201).json(nouveau);
  } catch (error) { 
    console.error('Erreur lors de la création du fournisseur:', error);
    res.status(500).json({ message: 'Erreur de création' }); 
  }
};