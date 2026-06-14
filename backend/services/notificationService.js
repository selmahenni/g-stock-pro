// services/notificationService.js
const emailService = require('./emailService');
// Si tu as une table "Notifications" dans ta base de données, tu pourrais importer le modèle ici :
// const Notification = require('../models/Notification'); 

/**
 * @class NotificationService
 * @description Gère la logique métier des notifications (Emails, DB, Push...).
 */
class NotificationService {
  
  /**
   * @method alerterRuptureStock
   * @description Envoie une alerte de stock bas aux magasiniers et super-admins.
   * @param {Object} produit - L'objet produit concerné.
   * @param {Array<string>} emailsDestinataires - Liste des adresses emails à alerter.
   */
  async alerterRuptureStock(produit, emailsDestinataires) {
    const sujet = `⚠️ Alerte G-Stock Pro : Stock bas pour ${produit.nom}`;
    const contenuHtml = `
      <h2>Alerte de niveau de stock</h2>
      <p>Le produit <strong>${produit.nom}</strong> a atteint son seuil d'alerte.</p>
      <ul>
        <li><strong>Référence :</strong> ${produit.reference}</li>
        <li><strong>Quantité actuelle :</strong> <span style="color: red;">${produit.quantite_actuelle}</span></li>
        <li><strong>Seuil minimum :</strong> ${produit.seuil_alerte}</li>
      </ul>
      <p>Veuillez prévoir un réapprovisionnement rapidement.</p>
    `;

    // On boucle sur les destinataires pour envoyer l'email
    for (const email of emailsDestinataires) {
      await emailService.envoyerEmail(email, sujet, contenuHtml);
    }
    
    // 💡 Optionnel : Ici, tu pourrais aussi faire un INSERT dans une table "Notifications"
    // await Notification.create({ type: 'STOCK', message: sujet, ... });
  }

  /**
   * @method notifierNouvelleMaintenance
   * @description Alerte un technicien qu'une maintenance a été planifiée.
   * @param {Object} actif - L'équipement concerné.
   * @param {Object} technicien - Les infos du technicien.
   */
  async notifierNouvelleMaintenance(actif, technicien) {
    const sujet = `🔧 G-Stock Pro : Nouvelle maintenance assignée`;
    const contenuHtml = `
      <h2>Nouvelle intervention requise</h2>
      <p>Bonjour ${technicien.nom},</p>
      <p>Une nouvelle opération de maintenance a été signalée pour l'équipement <strong>${actif.nom}</strong> (Réf: ${actif.reference}).</p>
      <p>Merci de consulter le tableau de bord pour plus de détails.</p>
    `;

    await emailService.envoyerEmail(technicien.adresse_email, sujet, contenuHtml);
  }
}

module.exports = new NotificationService();