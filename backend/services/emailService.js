// services/emailService.js
const nodemailer = require('nodemailer');

/**
 * @class EmailService
 * @description Gère la configuration et l'envoi des emails via Nodemailer.
 */
class EmailService {
  constructor() {
    // Initialisation du transporteur avec les variables d'environnement
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true pour le port 465, false pour les autres
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * @method envoyerEmail
   * @description Envoie un email générique.
   * @param {string} destinataire - L'adresse email du destinataire.
   * @param {string} sujet - L'objet de l'email.
   * @param {string} contenuHtml - Le corps de l'email en format HTML.
   * @returns {Promise<Object>} Le résultat de l'envoi.
   */
  async envoyerEmail(destinataire, sujet, contenuHtml) {
    try {
      const options = {
        from: process.env.EMAIL_FROM,
        to: destinataire,
        subject: sujet,
        html: contenuHtml,
      };

      const info = await this.transporter.sendMail(options);
      console.log(`✉️ Email envoyé avec succès à ${destinataire} [ID: ${info.messageId}]`);
      return info;
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de l'email à ${destinataire}:`, error);
      throw error; // On relance l'erreur pour que le contrôleur puisse la gérer
    }
  }
}

// On exporte une *instance* de la classe (Design Pattern : Singleton)
// Ainsi, le transporteur n'est créé qu'une seule fois au démarrage de l'app.
module.exports = new EmailService();