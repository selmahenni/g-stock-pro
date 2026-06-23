// controllers/maintenanceController.js
const Maintenance = require('../models/Maintenance');
const maintenanceService = require('../services/maintenanceService');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');

/**
 * @function getAllMaintenances
 * @description Historique paginé de tous les tickets de maintenance.
 */
exports.getAllMaintenances = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const type = req.query.type || null;       // 'preventif' | 'curatif'
    const statut = req.query.statut || null;   // 'planifie' | 'en_cours' | 'termine' | 'annule'

    const { rows, total } = await Maintenance.findPaginated({ page, limit, search, type, statut });
    const totalPages = Math.ceil(total / limit) || 1;

    const { rows: s } = await pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE statut='planifie')::int AS planifie,
             COUNT(*) FILTER (WHERE statut='en_cours')::int AS en_cours,
             COUNT(*) FILTER (WHERE statut='termine')::int  AS termine
      FROM maintenances`);

    res.status(200).json({
      stats: s[0],
      metadata: {
        total_items: total,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
      maintenances: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllMaintenances):', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function getEcheancier
 * @description Échéancier préventif calculé côté serveur : ne renvoie que les
 * `limit` échéances les plus proches + les totaux (suivis / en retard).
 */
exports.getEcheancier = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const { rows, total, enRetard } = await Maintenance.getEcheancier({ limit });
    res.status(200).json({ echeancier: rows, total, en_retard: enRetard });
  } catch (error) {
    console.error('Erreur (getEcheancier):', error);
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
    if (error.status) return res.status(error.status).json({ message: error.message });
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
    // État AVANT mise à jour (pour détecter un vrai changement de statut)
    const avant = await Maintenance.findById(req.params.id);

    const updated = await Maintenance.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Ticket non trouvé pour la mise à jour.' });

    // Resynchronisation de l'actif à CHAQUE changement de statut (cohérence statut + échéance).
    //  - « terminé » : clôture (ferme les planifiés résiduels) + resync.
    //  - autres transitions (planifié, en_cours, annulé) : resync général.
    if (updated.actif_id) {
      try {
        if (updated.statut === 'termine') {
          await maintenanceService.synchroniserApresCloture(updated.actif_id);
        } else {
          await maintenanceService.synchroniserActif(updated.actif_id);
        }
      } catch (err) {
        console.error('❌ Resync actif (maj ticket) :', err.message);
      }
    }

    // Notification si le ticket BASCULE vers un état nécessitant une action :
    //  - en_cours  → intervention en cours
    //  - planifie  → maintenance à planifier
    // Destinataires : techniciens + super_admin (in-app + e-mail), via le ciblage centralisé.
    const statutChange = avant && avant.statut !== updated.statut;
    if (statutChange && updated.actif_id && ['en_cours', 'planifie'].includes(updated.statut)) {
      try {
        const ctx = await maintenanceService.getActifContext(updated.actif_id);
        const serie = ctx?.numero_serie || `#${updated.actif_id}`;
        const prod = ctx?.produit_libelle ? ` (${ctx.produit_libelle})` : '';
        const infos = updated.statut === 'en_cours'
          ? { titre: 'Maintenance en cours',     message: `Intervention de maintenance en cours sur l'actif ${serie}${prod}.` }
          : { titre: 'Maintenance à planifier',  message: `Une maintenance est planifiée pour l'actif ${serie}${prod}.` };
        notificationService.notifierTechniciens(
          { numero_serie: serie, produit_libelle: ctx?.produit_libelle },
          { ...infos, lien: `/actifs/${updated.actif_id}` }
        ).catch(err => console.error('❌ Notif maj maintenance échouée:', err.message));
      } catch (err) {
        console.error('❌ Préparation notif maj maintenance :', err.message);
      }
    }

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
