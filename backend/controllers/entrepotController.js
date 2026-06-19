// controllers/entrepotController.js
const Entrepot = require('../models/Entrepot');

/**
 * @function getEntrepots
 * @description Récupère la liste de tous les entrepôts.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.getEntrepots = async (req, res) => {
  try {
    const entrepots = await Entrepot.findAll();
    res.status(200).json(entrepots);
  } catch (error) {
    console.error('Erreur (getEntrepots):', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des entrepôts.' });
  }
};

/**
 * @function getEntrepotById
 * @description Récupère un entrepôt par son identifiant.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getEntrepotById = async (req, res) => {
  try {
    const { id } = req.params;
    const entrepot = await Entrepot.findById(id);

    if (!entrepot) {
      return res.status(404).json({ message: 'Entrepôt non trouvé.' });
    }

    res.status(200).json(entrepot);
  } catch (error) {
    console.error('Erreur (getEntrepotById):', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @function createEntrepot
 * @description Crée un nouvel entrepôt.
 * @param {Object} req - Objet de requête Express (body: { nom, adresse, est_actif }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.createEntrepot = async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: 'Le nom de l\'entrepôt est requis.' });
    }

    const nouvelEntrepot = await Entrepot.create(req.body);
    res.status(201).json(nouvelEntrepot);
  } catch (error) {
    console.error('Erreur (createEntrepot):', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'entrepôt.' });
  }
};

/**
 * @function updateEntrepot
 * @description Met à jour les informations d'un entrepôt existant.
 * @param {Object} req - Objet de requête Express (params.id, body: { nom, adresse, est_actif }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateEntrepot = async (req, res) => {
  try {
    const { id } = req.params;

    const existant = await Entrepot.findById(id);
    if (!existant) {
      return res.status(404).json({ message: 'Entrepôt non trouvé.' });
    }

    // Fusion sécurisée : on préserve les valeurs existantes si non envoyées
    const dataToUpdate = {
      nom:      req.body.nom       ?? existant.nom,
      adresse:  req.body.adresse   ?? existant.adresse,
      est_actif: req.body.est_actif !== undefined ? req.body.est_actif : existant.est_actif,
    };

    const entrepotMisAJour = await Entrepot.update(id, dataToUpdate);
    res.status(200).json({
      message:  'Entrepôt mis à jour avec succès.',
      entrepot: entrepotMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateEntrepot):', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'entrepôt.' });
  }
};

/**
 * @function deleteEntrepot
 * @description Supprime un entrepôt (réservé au super_admin).
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteEntrepot = async (req, res) => {
  try {
    const { id } = req.params;

    const estSupprime = await Entrepot.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Entrepôt non trouvé ou déjà supprimé.' });
    }

    res.status(200).json({ message: 'Entrepôt supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteEntrepot):', error);
    // Gestion de la contrainte FK (entrepôt lié à des actifs ou stocks)
    if (error.code === '23503') {
      return res.status(409).json({
        message: 'Impossible de supprimer : des actifs ou stocks sont encore liés à cet entrepôt.',
      });
    }
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'entrepôt.' });
  }
};