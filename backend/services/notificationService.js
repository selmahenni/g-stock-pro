// services/notificationService.js
const emailService = require('./emailService');
const pool = require('../config/db'); // Accès DB pour écrire dans la table notifications

/**
 * SOURCE DE VÉRITÉ UNIQUE du ciblage des notifications (règles métier G-Stock Pro).
 * Pour chaque type, on distingue DEUX canaux :
 *   - `notif` : rôles qui reçoivent la notification in-app (la cloche).
 *   - `email` : rôles qui reçoivent EN PLUS un e-mail (sous-ensemble de `notif`).
 *
 * Règles appliquées :
 *   - alerte_stock → notif : super_admin + magasinier ; e-mail : super_admin SEULEMENT.
 *   - mouvement    → notif : super_admin + magasinier ; e-mail : aucun.
 *   - maintenance  → notif SEULEMENT (pas d'e-mail) : technicien ET super_admin.
 *   - consultant   → AUCUNE notification (absent de toutes les listes).
 * Impossible d'envoyer à un rôle/canal non prévu par cette table.
 */
const CIBLES_PAR_TYPE = {
  alerte_stock: { notif: ['super_admin', 'magasinier'], email: ['super_admin'] },
  mouvement:    { notif: ['super_admin', 'magasinier'], email: [] },
  maintenance:  { notif: ['technicien', 'super_admin'], email: [] },
};

/**
 * @class NotificationService
 * @description Logique métier des notifications (in-app + e-mail), avec un ciblage
 * centralisé et strict par rôle.
 */
class NotificationService {
  /**
   * Diffuseur central : crée une notification in-app pour chaque utilisateur ACTIF
   * dont le rôle est ciblé (canal `notif`), et envoie un e-mail aux rôles du canal `email`.
   * Le canal e-mail par type/rôle est défini par CIBLES_PAR_TYPE (pas par l'appelant).
   * @param {Object} opts
   * @param {'alerte_stock'|'mouvement'|'maintenance'} opts.type_notif - Détermine les destinataires.
   * @param {string} opts.titre
   * @param {string} opts.message
   * @param {string} [opts.lien=null]
   * @param {string} [opts.sujetEmail] - Sujet de l'e-mail (défaut dérivé du titre).
   * @param {string} [opts.htmlEmail] - Corps HTML de l'e-mail (défaut dérivé du message).
   * @returns {Promise<number>} Nombre de destinataires notifiés (in-app).
   */
  async diffuser({ type_notif, titre, message, lien = null, sujetEmail, htmlEmail }) {
    const cfg = CIBLES_PAR_TYPE[type_notif] || {};
    const rolesNotif = cfg.notif || [];
    const rolesEmail = cfg.email || [];
    // Type inconnu / sans cible (ex : règle non définie) → aucune diffusion (sécurité).
    if (rolesNotif.length === 0) return 0;

    // Union des rôles concernés (notif ∪ email) — utilisateurs ACTIFS uniquement.
    const tousRoles = [...new Set([...rolesNotif, ...rolesEmail])];
    const { rows: destinataires } = await pool.query(
      `SELECT id, nom_complet, adresse_email, role
       FROM utilisateurs
       WHERE role = ANY($1::text[]) AND est_actif = TRUE`,
      [tousRoles]
    );

    const sujet = sujetEmail || `G-Stock Pro : ${titre}`;
    const html = htmlEmail || `<h2>${titre}</h2><p>${message}</p>`;

    for (const u of destinataires) {
      const recoitNotif = rolesNotif.includes(u.role);
      const recoitEmail = rolesEmail.includes(u.role) && Boolean(u.adresse_email);

      // 1. Notification in-app (drapeau email_envoye = un e-mail part aussi pour ce rôle)
      if (recoitNotif) {
        await pool.query(
          `INSERT INTO notifications (utilisateur_id, titre, type_notif, message, lien, email_envoye)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [u.id, titre, type_notif, message, lien, recoitEmail]
        );
      }

      // 2. E-mail (non bloquant : un échec d'e-mail n'interrompt pas la diffusion)
      if (recoitEmail) {
        emailService.envoyerEmail(u.adresse_email, sujet, html)
          .catch(err => console.error(`❌ E-mail notification (${type_notif}) échoué:`, err.message));
      }
    }
    return destinataires.length;
  }

  /**
   * @method alerterRuptureStock
   * @description Alerte de stock critique → super_admin + magasinier (in-app + e-mail),
   * plus un e-mail complémentaire au service achat (adresse fixe, hors rôles applicatifs).
   * @param {Object} produit - { libelle, quantite_actuelle, stock_critique }.
   */
  async alerterRuptureStock(produit) {
    try {
      const titre = `Stock critique : ${produit.libelle}`;
      const message = `Le stock est tombé à ${produit.quantite_actuelle} (seuil : ${produit.stock_critique}).`;
      const sujet = `⚠️ Alerte G-Stock Pro : Stock critique pour ${produit.libelle}`;
      const html = `
        <h2>Alerte de niveau de stock</h2>
        <p>Le produit <strong>${produit.libelle}</strong> a atteint ou franchi son seuil critique.</p>
        <ul>
          <li><strong>Quantité actuelle :</strong> <span style="color:red;">${produit.quantite_actuelle}</span></li>
          <li><strong>Seuil critique (limite) :</strong> ${produit.stock_critique}</li>
        </ul>
        <p>Veuillez prévoir un réapprovisionnement rapidement.</p>`;

      await this.diffuser({
        type_notif: 'alerte_stock',
        titre,
        message,
        lien: '/inventaire',
        sujetEmail: sujet,
        htmlEmail: html,
      });

      // E-mail complémentaire au service achat (n'est pas un rôle utilisateur de l'app)
      const emailAchat = process.env.EMAIL_ACHAT || 'achat@gstockpro.com';
      emailService.envoyerEmail(emailAchat, sujet, html)
        .catch(err => console.error('❌ E-mail achat (alerte stock) échoué:', err.message));
    } catch (error) {
      console.error('❌ Erreur interne dans alerterRuptureStock :', error);
    }
  }

  /**
   * @method notifierMouvementEntrant
   * @description Entrée de stock → super_admin + magasinier (in-app + e-mail).
   * @param {Object} actif - { numero_serie, produit_libelle }.
   */
  async notifierMouvementEntrant(actif) {
    try {
      const produit = actif.produit_libelle ? ` (${actif.produit_libelle})` : '';
      await this.diffuser({
        type_notif: 'mouvement',
        titre: 'Entrée de stock',
        message: `Entrée en stock de l'actif ${actif.numero_serie}${produit}.`,
        lien: '/mouvements',
      });
    } catch (error) {
      console.error('❌ Erreur interne dans notifierMouvementEntrant :', error);
    }
  }

  /**
   * @method notifierNouveauProduit
   * @description Nouveau produit au catalogue → super_admin + magasinier (in-app + e-mail).
   * @param {Object} produit - { libelle, sku }.
   */
  async notifierNouveauProduit(produit) {
    try {
      const ref = produit.sku ? ` (${produit.sku})` : '';
      const message = `Le produit « ${produit.libelle} »${ref} a été ajouté au catalogue.`;
      await this.diffuser({
        type_notif: 'mouvement',
        titre: 'Nouveau produit',
        message,
        lien: '/produits',
      });
    } catch (error) {
      console.error('❌ Erreur interne dans notifierNouveauProduit :', error);
    }
  }

  /**
   * @method notifierTechniciens
   * @description Panne déclarée ou échéance préventive → techniciens (in-app + e-mail).
   * @param {Object} actif - { numero_serie, produit_libelle }.
   * @param {Object} infos - { titre, message, lien }.
   */
  async notifierTechniciens(actif, { titre, message, lien }) {
    try {
      await this.diffuser({
        type_notif: 'maintenance',
        titre,
        message,
        lien: lien || '/maintenances',
        sujetEmail: `🔧 G-Stock Pro : ${titre}`,
        htmlEmail: `<h2>${titre}</h2><p>${message}</p><p>Consultez la fiche de l'actif pour intervenir.</p>`,
      });
    } catch (error) {
      console.error('❌ Erreur interne dans notifierTechniciens :', error);
    }
  }

  /**
   * @method notifierNouvelleMaintenance
   * @description Maintenance assignée à UN technicien précis (in-app + e-mail).
   * Respecte strictement la règle « maintenance → technicien » : la notification n'est
   * créée que si le destinataire est bien un technicien actif (aucun autre rôle ne reçoit
   * de notification de maintenance).
   * @param {Object} actif - { numero_serie }.
   * @param {Object} technicien - { id, nom_complet, adresse_email }.
   */
  async notifierNouvelleMaintenance(actif, technicien) {
    try {
      if (!technicien?.id) return;

      // Garde-fou de ciblage : on ne notifie que des techniciens actifs.
      const { rows } = await pool.query(
        `SELECT 1 FROM utilisateurs WHERE id = $1 AND role = 'technicien' AND est_actif = TRUE`,
        [technicien.id]
      );
      if (rows.length === 0) return;

      const titre = 'Nouvelle maintenance';
      const message = `Intervention requise sur l'actif ${actif.numero_serie}.`;

      // Maintenance = notification in-app uniquement (aucun e-mail).
      await pool.query(
        `INSERT INTO notifications (utilisateur_id, titre, type_notif, message, lien, email_envoye)
         VALUES ($1, $2, 'maintenance', $3, '/maintenances', FALSE)`,
        [technicien.id, titre, message]
      );
    } catch (error) {
      console.error('❌ Erreur interne dans notifierNouvelleMaintenance :', error);
    }
  }
}

const service = new NotificationService();
service.CIBLES_PAR_TYPE = CIBLES_PAR_TYPE; // exposé pour tests / référence
module.exports = service;
