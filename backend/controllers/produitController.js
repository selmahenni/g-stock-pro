// controllers/produitController.js
const Produit = require('../models/Produit');

/**
 * @function getAllProduits
 * @description Récupère la liste de tous les produits.
 * @param {Object} req - L'objet de requête Express.
 * @param {Object} res - L'objet de réponse Express.
 */
exports.getAllProduits = async (req, res) => {
  try {
    const produits = await Produit.findAll();
    res.status(200).json(produits);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function getProduitById
 * @description Récupère les détails d'un produit spécifique.
 * @param {Object} req - L'objet de requête Express.
 * @param {Object} res - L'objet de réponse Express.
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
 * @param {Object} req - L'objet de requête Express (doit contenir le body).
 * @param {Object} res - L'objet de réponse Express.
 */
exports.createProduit = async (req, res) => {
  try {
    // Note: Dans un projet réel, il faudrait valider req.body ici (ex: avec Joi ou Zod)
    const nouveauProduit = await Produit.create(req.body);
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
 * @param {Object} req - L'objet de requête Express.
 * @param {Object} res - L'objet de réponse Express.
 */
exports.updateProduit = async (req, res) => {
  try {
    const id = req.params.id;
    const produitMisAJour = await Produit.update(id, req.body);
    
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
 * @param {Object} req - L'objet de requête Express.
 * @param {Object} res - L'objet de réponse Express.
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