// services/notificationService.js
const emailService = require('./emailService');
const pool = require('../config/db'); // On importe la DB pour écrire dans la table notifications

/**
 * @class NotificationService
 * @description Gère la logique métier des notifications (Emails et enregistrement en Base de données).
 */
class NotificationService {
  
  /**
   * @method alerterRuptureStock
   * @description Envoie une alerte de stock bas par email et l'enregistre dans la DB.
   * @param {Object} produit - L'objet contenant { libelle, quantite_actuelle, stock_critique }.
   * @param {Array<string>} emailsDestinataires - Liste des adresses emails à alerter.
   */
  async alerterRuptureStock(produit, emailsDestinataires) {
    try {
      const sujet = `⚠️ Alerte G-Stock Pro : Stock critique pour ${produit.libelle}`;
      const contenuHtml = `
        <h2>Alerte de niveau de stock</h2>
        <p>Le produit <strong>${produit.libelle}</strong> a atteint ou franchi son seuil critique.</p>
        <ul>
          <li><strong>Quantité actuelle :</strong> <span style="color: red;">${produit.quantite_actuelle}</span></li>
          <li><strong>Seuil critique (limite) :</strong> ${produit.stock_critique}</li>
        </ul>
        <p>Veuillez prévoir un réapprovisionnement rapidement.</p>
      `;

      // Boucle sur chaque email pour envoyer le message ET insérer en base
      for (const email of emailsDestinataires) {
        // 1. Envoi de l'email
        await emailService.envoyerEmail(email, sujet, contenuHtml);

        // 2. Recherche de l'ID de l'utilisateur via son email
        const userQuery = `SELECT id FROM utilisateurs WHERE adresse_email = $1`;
        const { rows: userRows } = await pool.query(userQuery, [email]);

        // 3. Si l'utilisateur existe en base, on crée la notification système
        if (userRows.length > 0) {
          const utilisateurId = userRows[0].id;
          const insertNotifQuery = `
            INSERT INTO notifications (utilisateur_id, titre, type_notif, message, lien)
            VALUES ($1, $2, $3, $4, $5)
          `;
          const valeursNotif = [
            utilisateurId,
            `Stock critique : ${produit.libelle}`,
            'alerte_stock',
            `Le stock est tombé à ${produit.quantite_actuelle} (Seuil: ${produit.stock_critique}).`,
            '/stocks' // Lien symbolique pour le futur front-end
          ];
          
          await pool.query(insertNotifQuery, valeursNotif);
        }
      }
    } catch (error) {
      console.error("❌ Erreur interne dans alerterRuptureStock :", error);
    }
  }

  /**
   * @method notifierNouvelleMaintenance
   * @description Alerte un technicien (email + DB) qu'une maintenance a été planifiée.
   * @param {Object} actif - L'équipement concerné (ex: { numero_serie: 'SN123' }).
   * @param {Object} technicien - Les infos du technicien (ex: { id: 3, nom_complet: 'Ali', adresse_email: '...' }).
   */
  async notifierNouvelleMaintenance(actif, technicien) {
    try {
      const sujet = `🔧 G-Stock Pro : Nouvelle maintenance assignée`;
      const contenuHtml = `
        <h2>Nouvelle intervention requise</h2>
        <p>Bonjour ${technicien.nom_complet},</p>
        <p>Une nouvelle opération de maintenance a été signalée pour l'équipement (N° de série: ${actif.numero_serie}).</p>
        <p>Merci de consulter le tableau de bord pour plus de détails.</p>
      `;

      // 1. Envoi de l'email
      await emailService.envoyerEmail(technicien.adresse_email, sujet, contenuHtml);

      // 2. Enregistrement en base de données
      if (technicien.id) {
        const insertNotifQuery = `
          INSERT INTO notifications (utilisateur_id, titre, type_notif, message, lien)
          VALUES ($1, $2, $3, $4, $5)
        `;
        const valeursNotif = [
          technicien.id,
          'Nouvelle Maintenance',
          'maintenance',
          `Intervention requise sur l'actif ${actif.numero_serie}.`,
          '/maintenances'
        ];
        
        await pool.query(insertNotifQuery, valeursNotif);
      }
    } catch (error) {
      console.error("❌ Erreur interne dans notifierNouvelleMaintenance :", error);
    }
  }
}

module.exports = new NotificationService();