// controllers/mouvementController.js
const Mouvement = require('../models/Mouvement');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');
const { ajusterStock } = require('../services/stockService');

/**
 * @function getAllMouvements
 * @description Récupère l'historique paginé de tous les mouvements d'entrée/sortie.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllMouvements = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;

    const tousLesMouvements = await Mouvement.findAll();

    const totalItems = tousLesMouvements.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex   = startIndex + limit;

    const mouvementsPagines = tousLesMouvements.slice(startIndex, endIndex);

    res.status(200).json({
      metadata: {
        total_items:       totalItems,
        total_pages:       totalPages,
        current_page:      page,
        per_page:          limit,
        has_next_page:     page < totalPages,
        has_previous_page: page > 1,
      },
      mouvements: mouvementsPagines,
    });
  } catch (error) {
    console.error('Erreur (getAllMouvements):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getMouvementById
 * @description Récupère un mouvement spécifique par son identifiant.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getMouvementById = async (req, res) => {
  try {
    const { id } = req.params;
    const mouvement = await Mouvement.findById(id);

    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé.' });
    }

    res.status(200).json(mouvement);
  } catch (error) {
    console.error('Erreur (getMouvementById):', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @function createMouvement
 * @description Enregistre un nouveau mouvement et met à jour le stock correspondant.
 * Déclenche une alerte email si le stock passe sous le seuil critique.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.createMouvement = async (req, res) => {
  try {
    const { actif_id, type_mouvement } = req.body;

    // L'entrepôt n'est plus saisi : il est déduit de l'actif concerné.
    // On récupère aussi le produit lié (pour le stock et les alertes).
    let infoActif = null;
    if (actif_id) {
      const { rows } = await pool.query(
        `SELECT a.produit_id, a.entrepot_id, a.numero_serie,
                p.libelle AS produit_libelle, p.stock_critique
         FROM actifs a
         JOIN produits p ON a.produit_id = p.id
         WHERE a.id = $1`,
        [actif_id]
      );
      infoActif = rows[0] || null;
    }

    // Entrepôt = celui de l'actif (ou, à défaut, celui éventuellement fourni)
    const entrepotId = infoActif?.entrepot_id ?? req.body.entrepot_id ?? null;

    // Traçabilité : l'auteur du mouvement est l'utilisateur connecté (token)
    const nouveauMouvement = await Mouvement.create({
      ...req.body,
      entrepot_id:  entrepotId,
      effectue_par: req.utilisateur?.id ?? req.body.effectue_par ?? null,
    });

    // Mise à jour du stock et notifications
    if (infoActif && entrepotId) {
      // Incrément (entrée) / décrément (sortie) via le service de stock partagé
      const delta = type_mouvement === 'entree' ? +1 : type_mouvement === 'sortie' ? -1 : 0;
      const quantiteActuelle = await ajusterStock(infoActif.produit_id, entrepotId, delta) ?? 0;

      // Notification d'entrée en stock destinée aux magasiniers (in-app + email)
      if (type_mouvement === 'entree') {
        notificationService.notifierMouvementEntrant({
          numero_serie:    infoActif.numero_serie,
          produit_libelle: infoActif.produit_libelle,
        }).catch(err => console.error('❌ Notification mouvement entrant échouée:', err));
      }

      // Alerte si le stock atteint / franchit le seuil critique
      if (quantiteActuelle <= infoActif.stock_critique) {
        // Super-admin + magasinier (existant) + service achat (Mailtrap)
        const emailAchat = process.env.EMAIL_ACHAT || 'achat@gstockpro.com';
        const destinataires = ['super_admin@gstockpro.com', 'magasinier@gstockpro.com', emailAchat];
        notificationService.alerterRuptureStock(
          { libelle: infoActif.produit_libelle, quantite_actuelle: quantiteActuelle, stock_critique: infoActif.stock_critique },
          destinataires
        ).catch(err => console.error('❌ Erreur lors de l\'envoi de l\'alerte email:', err));
      }
    }

    res.status(201).json({
      message:   'Mouvement et stock mis à jour avec succès.',
      mouvement: nouveauMouvement,
    });
  } catch (error) {
    console.error('Erreur (createMouvement):', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du mouvement.' });
  }
};

/**
 * @function updateMouvement
 * @description Corrige un mouvement existant (ex: erreur de notes ou de type).
 * À utiliser avec précaution pour ne pas corrompre l'historique d'audit.
 * @param {Object} req - Objet de requête Express (params.id, body).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateMouvement = async (req, res) => {
  try {
    const { id } = req.params;

    const existant = await Mouvement.findById(id);
    if (!existant) {
      return res.status(404).json({ message: 'Mouvement non trouvé.' });
    }

    const mouvementMisAJour = await Mouvement.update(id, req.body);
    res.status(200).json({
      message:   'Mouvement mis à jour avec succès.',
      mouvement: mouvementMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateMouvement):', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du mouvement.' });
  }
};

/**
 * @function deleteMouvement
 * @description Supprime un mouvement (réservé au super_admin pour corriger des erreurs de saisie).
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteMouvement = async (req, res) => {
  try {
    const { id } = req.params;

    const estSupprime = await Mouvement.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Mouvement non trouvé ou déjà supprimé.' });
    }

    res.status(200).json({ message: 'Mouvement supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteMouvement):', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du mouvement.' });
  }
};