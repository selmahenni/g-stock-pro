// controllers/messageController.js
const Message = require('../models/Message');
const emailService = require('../services/emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Construit le corps HTML d'un e-mail de messagerie (interne en copie ou externe). */
function corpsHtml({ expediteurNom, sujet, corps }) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937">
      <p style="color:#6b7280;font-size:13px;margin:0 0 4px">Message envoyé via G-Stock Pro${expediteurNom ? ` par ${expediteurNom}` : ''} :</p>
      <h2 style="margin:0 0 12px">${sujet}</h2>
      <div style="white-space:pre-wrap;line-height:1.5">${(corps || '').replace(/</g, '&lt;')}</div>
    </div>`;
}

/**
 * @function getBoiteReception
 * @description Messages reçus par l'utilisateur connecté + compteur non lus.
 */
exports.getBoiteReception = async (req, res) => {
  try {
    const userId = req.utilisateur?.id;
    const [messages, nonLus] = await Promise.all([
      Message.boiteReception(userId),
      Message.nonLus(userId),
    ]);
    res.status(200).json({ non_lus: nonLus, messages });
  } catch (error) {
    console.error('Erreur (getBoiteReception):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getNonLus
 * @description Compteur léger de messages reçus non lus (pour le badge de la sidebar).
 */
exports.getNonLus = async (req, res) => {
  try {
    const non_lus = await Message.nonLus(req.utilisateur?.id);
    res.status(200).json({ non_lus });
  } catch (error) {
    console.error('Erreur (getNonLus):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getEnvoyes
 * @description Messages envoyés par l'utilisateur connecté.
 */
exports.getEnvoyes = async (req, res) => {
  try {
    const messages = await Message.envoyes(req.utilisateur?.id);
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Erreur (getEnvoyes):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getAnnuaire
 * @description Liste des utilisateurs actifs (hors soi) pour choisir un destinataire interne.
 */
exports.getAnnuaire = async (req, res) => {
  try {
    const utilisateurs = await Message.annuaire(req.utilisateur?.id);
    res.status(200).json({ utilisateurs });
  } catch (error) {
    console.error('Erreur (getAnnuaire):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function envoyer
 * @description Envoie un message interne (à un collègue) OU externe (à une adresse e-mail).
 * Body : { destinataire_id?, destinataire_email?, sujet, corps, copie_email? }
 *  - destinataire_email présent  → envoi EXTERNE (vrai e-mail) + archivage.
 *  - sinon destinataire_id       → message INTERNE (boîte de réception) + e-mail optionnel (copie_email).
 */
exports.envoyer = async (req, res) => {
  try {
    const expediteurId = req.utilisateur?.id;
    const { destinataire_id, destinataire_email, sujet, corps, copie_email } = req.body;

    const sujetClean = (sujet || '').trim();
    const corpsClean = (corps || '').trim();
    if (!sujetClean || !corpsClean) {
      return res.status(400).json({ message: 'Le sujet et le message sont obligatoires.' });
    }

    const emailExterne = (destinataire_email || '').trim();

    // ---- Cas 1 : envoi EXTERNE (adresse e-mail libre, ex. service achat) ----
    if (emailExterne) {
      if (!EMAIL_REGEX.test(emailExterne)) {
        return res.status(400).json({ message: 'Adresse e-mail externe invalide.' });
      }
      const expediteurNom = req.utilisateur?.nom_complet; // souvent absent du token : géré côté affichage
      await emailService.envoyerEmail(emailExterne, `[G-Stock Pro] ${sujetClean}`, corpsHtml({ expediteurNom, sujet: sujetClean, corps: corpsClean }));

      const enregistre = await Message.creer({
        expediteur_id: expediteurId,
        destinataire_email: emailExterne,
        est_externe: true,
        sujet: sujetClean,
        corps: corpsClean,
      });
      return res.status(201).json({ message: `E-mail envoyé à ${emailExterne}.`, donnee: enregistre });
    }

    // ---- Cas 2 : message INTERNE (collègue) ----
    if (!destinataire_id) {
      return res.status(400).json({ message: 'Choisissez un destinataire (collègue) ou saisissez une adresse e-mail externe.' });
    }
    if (Number(destinataire_id) === Number(expediteurId)) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer un message à vous-même.' });
    }

    const enregistre = await Message.creer({
      expediteur_id: expediteurId,
      destinataire_id,
      est_externe: false,
      sujet: sujetClean,
      corps: corpsClean,
    });

    // Copie e-mail optionnelle au destinataire interne (non bloquant)
    let copieEnvoyee = false;
    if (copie_email) {
      const email = await Message.emailUtilisateur(destinataire_id);
      if (email) {
        emailService.envoyerEmail(email, `[G-Stock Pro] ${sujetClean}`, corpsHtml({ sujet: sujetClean, corps: corpsClean }))
          .catch(err => console.error('❌ Copie e-mail message interne échouée:', err.message));
        copieEnvoyee = true;
      }
    }

    res.status(201).json({ message: 'Message envoyé.', copie_email: copieEnvoyee, donnee: enregistre });
  } catch (error) {
    console.error('Erreur (envoyer message):', error);
    res.status(500).json({ message: "Erreur lors de l'envoi du message." });
  }
};

/**
 * @function marquerLu
 * @description Marque un message reçu comme lu.
 */
exports.marquerLu = async (req, res) => {
  try {
    const msg = await Message.marquerLu(req.params.id, req.utilisateur?.id);
    if (!msg) return res.status(404).json({ message: 'Message non trouvé.' });
    res.status(200).json({ message: 'Message marqué comme lu.', donnee: msg });
  } catch (error) {
    console.error('Erreur (marquerLu message):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};
