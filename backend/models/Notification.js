// models/Notification.js
const pool = require('../config/db');

/**
 * @class Notification
 * @description Modèle d'accès à la table "notifications" (alertes in-app par utilisateur).
 * Champs : id, utilisateur_id, titre, type_notif, message, lien, est_lu, cree_le.
 */
class Notification {
  /**
   * Récupère les notifications d'un utilisateur (les plus récentes d'abord).
   * @param {number} utilisateurId - ID de l'utilisateur connecté.
   * @param {number} [limit=30] - Nombre maximum de notifications à retourner.
   * @returns {Promise<Array>}
   */
  static async findByUser(utilisateurId, limit = 30) {
    const query = `
      SELECT id, utilisateur_id, titre, type_notif, message, lien, est_lu, cree_le
      FROM notifications
      WHERE utilisateur_id = $1
      ORDER BY cree_le DESC NULLS LAST, id DESC
      LIMIT $2
    `;
    const { rows } = await pool.query(query, [utilisateurId, limit]);
    return rows;
  }

  /**
   * Compte les notifications non lues d'un utilisateur.
   * @param {number} utilisateurId
   * @returns {Promise<number>}
   */
  static async countUnread(utilisateurId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM notifications WHERE utilisateur_id = $1 AND est_lu = FALSE',
      [utilisateurId]
    );
    return rows[0]?.total ?? 0;
  }

  /**
   * Marque une notification comme lue (si elle appartient à l'utilisateur).
   * @param {number} id
   * @param {number} utilisateurId
   * @returns {Promise<Object|undefined>}
   */
  static async markRead(id, utilisateurId) {
    const { rows } = await pool.query(
      'UPDATE notifications SET est_lu = TRUE WHERE id = $1 AND utilisateur_id = $2 RETURNING *',
      [id, utilisateurId]
    );
    return rows[0];
  }

  /**
   * Marque toutes les notifications d'un utilisateur comme lues.
   * @param {number} utilisateurId
   * @returns {Promise<number>} Nombre de notifications mises à jour.
   */
  static async markAllRead(utilisateurId) {
    const { rowCount } = await pool.query(
      'UPDATE notifications SET est_lu = TRUE WHERE utilisateur_id = $1 AND est_lu = FALSE',
      [utilisateurId]
    );
    return rowCount;
  }
}

module.exports = Notification;
