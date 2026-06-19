// controllers/maintenanceController.js
const Maintenance = require('../models/Maintenance');
const maintenanceService = require('../services/maintenanceService');

/**
 * @function getAllMaintenances
 * @description Historique paginé de tous les tickets de maintenance.
 */
exports.getAllMaintenances = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const tickets = await Maintenance.findAll();
    const totalItems = tickets.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;

    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
      maintenances: tickets.slice(startIndex, startIndex + limit),
    });
  } catch (error) {
    console.error('Erreur (getAllMaintenances):', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function getMaintenanceById
 * @description Détail d'un ticket de maintenance.
 */
exports.getMaintenanceById = async (req, res) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket de maintenance non trouvé.' });
    res.status(200).json(ticket);
  } catch (error) {
    console.error('Erreur (getMaintenanceById):', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function getMaintenancesByActif
 * @description Historique de maintenance d'un actif (route imbriquée /actifs/:id/maintenances).
 */
exports.getMaintenancesByActif = async (req, res) => {
  try {
    const tickets = await Maintenance.findByActif(req.params.id);
    res.status(200).json({ maintenances: tickets });
  } catch (error) {
    console.error('Erreur (getMaintenancesByActif):', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function declarerPanne
 * @description Déclare une panne (maintenance curative) sur un actif.
 */
exports.declarerPanne = async (req, res) => {
  try {
    const actifId = req.params.id;
    const ticket = await maintenanceService.declarerPanne(actifId, {
      rapport: req.body.rapport,
      technicien_id: req.body.technicien_id || null,
    });
    res.status(201).json({ message: 'Panne déclarée. Les techniciens ont été notifiés.', maintenance: ticket });
  } catch (error) {
    console.error('Erreur (declarerPanne):', error);
    res.status(500).json({ message: 'Erreur lors de la déclaration de la panne.' });
  }
};

/**
 * @function enregistrerEntretien
 * @description Enregistre un entretien terminé (préventif/curatif) sur un actif et recalcule l'échéance.
 */
exports.enregistrerEntretien = async (req, res) => {
  try {
    const actifId = req.params.id;
    const ticket = await maintenanceService.enregistrerEntretien(actifId, {
      type_maintenance: req.body.type_maintenance,
      rapport: req.body.rapport,
      date_intervention: req.body.date_intervention,
      cout: req.body.cout,
      // Par défaut : le technicien connecté
      technicien_id: req.body.technicien_id || req.utilisateur?.id || null,
    });
    res.status(201).json({ message: 'Entretien enregistré avec succès.', maintenance: ticket });
  } catch (error) {
    console.error('Erreur (enregistrerEntretien):', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'entretien.' });
  }
};

/**
 * @function updateMaintenance
 * @description Met à jour un ticket (statut, technicien, rapport, coût...).
 */
exports.updateMaintenance = async (req, res) => {
  try {
    const updated = await Maintenance.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Ticket non trouvé pour la mise à jour.' });
    res.status(200).json({ message: 'Ticket mis à jour avec succès.', maintenance: updated });
  } catch (error) {
    console.error('Erreur (updateMaintenance):', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
  }
};

/**
 * @function deleteMaintenance
 * @description Supprime un ticket de maintenance.
 */
exports.deleteMaintenance = async (req, res) => {
  try {
    const ok = await Maintenance.delete(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Ticket non trouvé pour la suppression.' });
    res.status(200).json({ message: 'Ticket supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteMaintenance):', error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};
