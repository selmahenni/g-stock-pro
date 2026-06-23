// controllers/fournisseurController.js
const Fournisseur = require('../models/Fournisseur');
const pool = require('../config/db');

/**
 * @function getAllFournisseurs
 * @description Récupère la liste des fournisseurs avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllFournisseurs = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();

    const { rows, total } = await Fournisseur.findPaginated({ page, limit, search });
    const totalPages = Math.ceil(total / limit) || 1;

    const { rows: s } = await pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE adresse_email IS NOT NULL AND adresse_email <> '')::int AS avec_email
      FROM fournisseurs`);

    res.status(200).json({
      stats: s[0],
      metadata: {
        total_items:       total,
        total_pages:       totalPages,
        current_page:      page,
        per_page:          limit,
        has_next_page:     page < totalPages,
        has_previous_page: page > 1,
      },
      fournisseurs: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllFournisseurs):', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * @function getFournisseurById
 * @description Récupère un fournisseur par son identifiant.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getFournisseurById = async (req, res) => {
  try {
    const { id } = req.params;
    const fournisseur = await Fournisseur.findById(id);

    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé.' });
    }

    res.status(200).json(fournisseur);
  } catch (error) {
    console.error('Erreur (getFournisseurById):', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * @function createFournisseur
 * @description Enregistre un nouveau fournisseur.
 * @param {Object} req - Objet de requête Express (body: { nom, adresse_email, telephone }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.createFournisseur = async (req, res) => {
  try {
    const { nom } = req.body;

    if (!nom) {
      return res.status(400).json({ message: 'Le champ "nom" est obligatoire.' });
    }

    const nouveau = await Fournisseur.create(req.body);
    res.status(201).json(nouveau);
  } catch (error) {
    console.error('Erreur (createFournisseur):', error);
    res.status(500).json({ message: 'Erreur lors de la création du fournisseur.' });
  }
};

/**
 * @function updateFournisseur
 * @description Met à jour les informations d'un fournisseur existant.
 * @param {Object} req - Objet de requête Express (params.id, body: { nom, adresse_email, telephone }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateFournisseur = async (req, res) => {
  try {
    const { id } = req.params;

    const existant = await Fournisseur.findById(id);
    if (!existant) {
      return res.status(404).json({ message: 'Fournisseur non trouvé.' });
    }

    // Fusion sécurisée : on ne remplace que les champs envoyés
    const dataToUpdate = {
      nom:           req.body.nom           ?? existant.nom,
      adresse_email: req.body.adresse_email ?? existant.adresse_email,
      telephone:     req.body.telephone     ?? existant.telephone,
    };

    const fournisseurMisAJour = await Fournisseur.update(id, dataToUpdate);
    res.status(200).json({
      message:      'Fournisseur mis à jour avec succès.',
      fournisseur:  fournisseurMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateFournisseur):', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du fournisseur.' });
  }
};

/**
 * @function deleteFournisseur
 * @description Supprime un fournisseur (réservé au super_admin).
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteFournisseur = async (req, res) => {
  try {
    const { id } = req.params;

    const estSupprime = await Fournisseur.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Fournisseur non trouvé ou déjà supprimé.' });
    }

    res.status(200).json({ message: 'Fournisseur supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteFournisseur):', error);
    // Gestion de la contrainte FK (fournisseur lié à des produits)
    if (error.code === '23503') {
      return res.status(409).json({
        message: 'Impossible de supprimer : des produits sont encore liés à ce fournisseur.',
      });
    }
    res.status(500).json({ message: 'Erreur lors de la suppression du fournisseur.' });
  }
};