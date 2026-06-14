// controllers/maintenanceController.js
const Maintenance = require('../models/Maintenance');

/**
 * @function getAllMaintenances
 * @description Récupère l'historique des maintenances avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllMaintenances = async (req, res) => {
  try {
    // 1. Paramètres de pagination (par défaut: page 1, 10 éléments)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 2. Récupération de toutes les données depuis la base
    const toutesLesMaintenances = await Maintenance.findAll();

    // 3. Calculs pour la pagination en mémoire
    const totalItems = toutesLesMaintenances.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Découpage du tableau
    const maintenancesPagines = toutesLesMaintenances.slice(startIndex, endIndex);

    // 4. Envoi de la réponse structurée
    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      maintenances: maintenancesPagines
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des maintenances:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function getMaintenanceById
 * @description Récupère les détails d'un rapport de maintenance spécifique.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.getMaintenanceById = async (req, res) => {
  try {
    const id = req.params.id;
    const maintenance = await Maintenance.findById(id);

    if (!maintenance) {
      return res.status(404).json({ message: 'Rapport de maintenance non trouvé.' });
    }
    
    res.status(200).json(maintenance);
  } catch (error) {
    console.error('Erreur lors de la récupération de la maintenance:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function createMaintenance
 * @description Enregistre un nouveau rapport de maintenance.
 * @param {Object} req - L'objet de requête Express contenant le corps (body).
 * @param {Object} res - L'objet de réponse Express.
 */
exports.createMaintenance = async (req, res) => {
  try {
    const { actif_id, rapport } = req.body;

    // Validation de base : on doit au moins savoir quel matériel est réparé
    if (!actif_id) {
      return res.status(400).json({ 
        message: 'L\'ID de l\'actif (actif_id) est obligatoire pour enregistrer une maintenance.' 
      });
    }

    /* 💡 ASTUCE DE PRO : 
      Puisque ta route utilise le middleware `verifyToken`, tu as accès à `req.utilisateur`.
      Au lieu de demander au front-end d'envoyer l'ID du technicien, tu peux le récupérer 
      directement depuis le token de la personne connectée !
      
      Exemple : 
      const dataMaintenance = {
        ...req.body,
        technicien_id: req.utilisateur.id // On force l'ID de la personne qui fait la requête
      };
      const nouvelleMaintenance = await Maintenance.create(dataMaintenance);
    */

    const nouvelleMaintenance = await Maintenance.create(req.body);
    
    res.status(201).json({
      message: 'Rapport de maintenance enregistré avec succès.',
      maintenance: nouvelleMaintenance
    });
  } catch (error) {
    console.error('Erreur lors de la création de la maintenance:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la maintenance.' });
  }
};

/**
 * @function updateMaintenance
 * @description Met à jour un rapport de maintenance existant (ex: pour rajouter des notes).
 */
exports.updateMaintenance = async (req, res) => {
  try {
    const id = req.params.id;
    const maintenanceMiseAJour = await Maintenance.update(id, req.body);
    
    if (!maintenanceMiseAJour) {
      return res.status(404).json({ message: 'Rapport non trouvé pour la mise à jour.' });
    }
    res.status(200).json({
      message: 'Maintenance mise à jour avec succès.',
      maintenance: maintenanceMiseAJour
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la maintenance:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
  }
};

/**
 * @function deleteMaintenance
 * @description Supprime un rapport de maintenance (Généralement réservé aux cas d'erreur de saisie).
 */
exports.deleteMaintenance = async (req, res) => {
  try {
    const id = req.params.id;
    const estSupprime = await Maintenance.delete(id);
    
    if (!estSupprime) {
      return res.status(404).json({ message: 'Rapport non trouvé pour la suppression.' });
    }
    res.status(200).json({ message: 'Rapport de maintenance supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la maintenance:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};