// controllers/notificationController.js
const Notification = require('../models/Notification');

/**
 * @function getMesNotifications
 * @description Retourne les notifications de l'utilisateur connecté + le compteur non lues.
 */
exports.getMesNotifications = async (req, res) => {
  try {
    const utilisateurId = req.utilisateur?.id;
    if (!utilisateurId) return res.status(401).json({ message: 'Non authentifié.' });

    const limit = parseInt(req.query.limit) || 30;
    const [notifications, nonLues] = await Promise.all([
      Notification.findByUser(utilisateurId, limit),
      Notification.countUnread(utilisateurId),
    ]);

    res.status(200).json({ non_lues: nonLues, notifications });
  } catch (error) {
    console.error('Erreur (getMesNotifications):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function marquerLue
 * @description Marque une notification de l'utilisateur connecté comme lue.
 */
exports.marquerLue = async (req, res) => {
  try {
    const utilisateurId = req.utilisateur?.id;
    const notif = await Notification.markRead(req.params.id, utilisateurId);
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée.' });
    res.status(200).json({ message: 'Notification marquée comme lue.', notification: notif });
  } catch (error) {
    console.error('Erreur (marquerLue):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function marquerToutLu
 * @description Marque toutes les notifications de l'utilisateur connecté comme lues.
 */
exports.marquerToutLu = async (req, res) => {
  try {
    const utilisateurId = req.utilisateur?.id;
    const count = await Notification.markAllRead(utilisateurId);
    res.status(200).json({ message: 'Notifications marquées comme lues.', mises_a_jour: count });
  } catch (error) {
    console.error('Erreur (marquerToutLu):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};
