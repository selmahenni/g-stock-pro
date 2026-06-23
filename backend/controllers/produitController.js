// controllers/produitController.js
const Produit = require('../models/Produit');
const notificationService = require('../services/notificationService');

/**
 * @function getAllProduits
 * @description Récupère la liste de tous les produits avec un système de pagination.
 * @param {Object} req - L'objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - L'objet de réponse Express.
 */
exports.getAllProduits = async (req, res) => {
  try {
    // Pagination + recherche côté serveur : on ne charge que la page demandée
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const categorieId = req.query.categorie_id ? parseInt(req.query.categorie_id) : null;

    const { rows, total } = await Produit.findPaginated({ page, limit, search, categorieId });
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
      produits: rows,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function getProduitById
 * @description Récupère les détails d'un produit spécifique.
 */
exports.getProduitById = async (req, res) => {
  try {
    const id = req.params.id;
    const produit = await Produit.findById(id);
    
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.status(200).json(produit);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function createProduit
 * @description Crée un nouveau produit dans le catalogue.
 */
exports.createProduit = async (req, res) => {
  try {
    // Traçabilité : on enregistre l'auteur de la création depuis le token
    const nouveauProduit = await Produit.create({ ...req.body, cree_par: req.utilisateur?.id ?? null });

    // Notification aux magasiniers (et super-admins) : nouveau produit au catalogue (non bloquant)
    notificationService.notifierNouveauProduit(nouveauProduit)
      .catch(err => console.error('❌ Notification nouveau produit échouée:', err));

    res.status(201).json({
      message: 'Produit créé avec succès',
      produit: nouveauProduit
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({ message: 'Erreur lors de la création' });
  }
};

/**
 * @function updateProduit
 * @description Met à jour les informations d'un produit existant.
 */
exports.updateProduit = async (req, res) => {
  try {
    const id = req.params.id;
    // Traçabilité : on enregistre l'auteur de la dernière modification
    const produitMisAJour = await Produit.update(id, { ...req.body, modifie_par: req.utilisateur?.id ?? null });
    
    if (!produitMisAJour) {
      return res.status(404).json({ message: 'Produit non trouvé pour la mise à jour' });
    }
    res.status(200).json({
      message: 'Produit mis à jour avec succès',
      produit: produitMisAJour
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

/**
 * @function deleteProduit
 * @description Supprime un produit du système.
 */
exports.deleteProduit = async (req, res) => {
  try {
    const id = req.params.id;
    const estSupprime = await Produit.delete(id);
    
    if (!estSupprime) {
      return res.status(404).json({ message: 'Produit non trouvé pour la suppression' });
    }
    res.status(200).json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};