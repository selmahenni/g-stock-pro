// controllers/actifController.js
const Actif = require('../models/Actif');
const { ajusterStock } = require('../services/stockService');
const maintenanceService = require('../services/maintenanceService');

/**
 * @function getAllActifs
 * @description Récupère tout l'inventaire physique avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllActifs = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();

    const { rows, total } = await Actif.findPaginated({ page, limit, search });
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
      actifs: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllActifs):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getActifById
 * @description Récupère un actif par son identifiant, avec les jointures produit et entrepôt.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getActifById = async (req, res) => {
  try {
    const { id } = req.params;
    const actif = await Actif.findById(id);

    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé.' });
    }

    res.status(200).json(actif);
  } catch (error) {
    console.error('Erreur (getActifById):', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @function createActif
 * @description Enregistre un nouveau matériel dans le parc.
 * @param {Object} req - Objet de requête Express (body: { produit_id, numero_serie, entrepot_id, ... }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.createActif = async (req, res) => {
  try {
    const { produit_id, numero_serie, entrepot_id } = req.body;

    if (!produit_id || !numero_serie || !entrepot_id) {
      return res.status(400).json({
        message: 'produit_id, numero_serie et entrepot_id sont obligatoires.',
      });
    }

    // Traçabilité : auteur de la création depuis le token
    const nouvelActif = await Actif.create({ ...req.body, cree_par: req.utilisateur?.id ?? null });

    // Toute création d'actif = une entrée physique : on incrémente le stock du produit
    // (non bloquant : une erreur de stock ne doit pas annuler l'enregistrement de l'actif)
    ajusterStock(nouvelActif.produit_id, nouvelActif.entrepot_id, +1)
      .catch(err => console.error('❌ Erreur ajustement stock (création actif):', err));

    // Initialise l'échéance de maintenance préventive selon la règle du produit (non bloquant)
    maintenanceService.initialiserPreventive(nouvelActif.id, new Date(nouvelActif.cree_le || Date.now()))
      .catch(err => console.error('❌ Init préventive (création actif):', err));

    res.status(201).json({
      message: 'Actif enregistré avec succès.',
      actif:   nouvelActif,
    });
  } catch (error) {
    console.error('Erreur (createActif):', error);
    // Numéro de série déjà existant (contrainte UNIQUE PostgreSQL)
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce numéro de série existe déjà dans le système.' });
    }
    res.status(500).json({ message: 'Erreur lors de la création de l\'actif.' });
  }
};

/**
 * @function updateActif
 * @description Met à jour un actif existant (statut, emplacement, affectation...).
 * Accessible au super_admin, magasinier et technicien (conformément à la matrice RBAC).
 * @param {Object} req - Objet de requête Express (params.id, body).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateActif = async (req, res) => {
  try {
    const { id } = req.params;

    const existant = await Actif.findById(id);
    if (!existant) {
      return res.status(404).json({ message: 'Actif non trouvé.' });
    }

    // Fusion sécurisée : on ne remplace que les champs envoyés
    const dataToUpdate = {
      produit_id:             req.body.produit_id              ?? existant.produit_id,
      numero_serie:           req.body.numero_serie            ?? existant.numero_serie,
      entrepot_id:            req.body.entrepot_id             ?? existant.entrepot_id,
      emplacement:            req.body.emplacement             ?? existant.emplacement,
      utilisateur_affecte_id: req.body.utilisateur_affecte_id ?? existant.utilisateur_affecte_id,
      statut:                 req.body.statut                  ?? existant.statut,
      prix_unitaire:          req.body.prix_unitaire           ?? existant.prix_unitaire,
      // Traçabilité : auteur de la dernière modification
      modifie_par:            req.utilisateur?.id ?? null,
    };

    const actifMisAJour = await Actif.update(id, dataToUpdate);
    res.status(200).json({
      message: 'Actif mis à jour avec succès.',
      actif:   actifMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateActif):', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce numéro de série existe déjà dans le système.' });
    }
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'actif.' });
  }
};

/**
 * @function deleteActif
 * @description Supprime un actif du parc matériel (réservé au super_admin).
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteActif = async (req, res) => {
  try {
    const { id } = req.params;

    // On récupère l'actif avant suppression pour pouvoir ajuster le stock
    const existant = await Actif.findById(id);

    const estSupprime = await Actif.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Actif non trouvé ou déjà supprimé.' });
    }

    // Suppression d'un actif = sortie physique : on décrémente le stock du produit (non bloquant)
    if (existant) {
      ajusterStock(existant.produit_id, existant.entrepot_id, -1)
        .catch(err => console.error('❌ Erreur ajustement stock (suppression actif):', err));
    }

    res.status(200).json({ message: 'Actif supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteActif):', error);
    // Contrainte FK : actif lié à des mouvements ou maintenances
    if (error.code === '23503') {
      return res.status(409).json({
        message: 'Impossible de supprimer : des mouvements ou maintenances sont liés à cet actif.',
      });
    }
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'actif.' });
  }
};