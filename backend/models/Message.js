// models/Message.js
const pool = require('../config/db');

/**
 * @class Message
 * @description Modèle d'accès à la table "public.messages" (messagerie interne/externe).
 * NB : on qualifie explicitement le schéma `public` car Supabase possède aussi une
 * table `realtime.messages` (collision de nom).
 */
class Message {
  /**
   * Crée un message (interne ou externe).
   * @param {Object} m - { expediteur_id, destinataire_id, destinataire_email, est_externe, sujet, corps }
   * @returns {Promise<Object>}
   */
  static async creer({ expediteur_id, destinataire_id = null, destinataire_email = null, est_externe = false, sujet, corps }) {
    const { rows } = await pool.query(
      `INSERT INTO public.messages
         (expediteur_id, destinataire_id, destinataire_email, est_externe, sujet, corps)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [expediteur_id, destinataire_id, destinataire_email, est_externe, sujet, corps]
    );
    return rows[0];
  }

  /**
   * Boîte de réception : messages internes reçus par l'utilisateur (avec nom de l'expéditeur).
   * @param {number} userId
   * @param {number} [limit=100]
   */
  static async boiteReception(userId, limit = 100) {
    const { rows } = await pool.query(
      `SELECT m.id, m.sujet, m.corps, m.est_lu, m.cree_le,
              m.expediteur_id,
              u.nom_complet AS expediteur_nom,
              u.role        AS expediteur_role
       FROM public.messages m
       LEFT JOIN utilisateurs u ON m.expediteur_id = u.id
       WHERE m.destinataire_id = $1
       ORDER BY m.cree_le DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }

  /**
   * Messages envoyés par l'utilisateur (interne : nom du destinataire ; externe : e-mail).
   * @param {number} userId
   * @param {number} [limit=100]
   */
  static async envoyes(userId, limit = 100) {
    const { rows } = await pool.query(
      `SELECT m.id, m.sujet, m.corps, m.est_externe, m.est_lu, m.cree_le,
              m.destinataire_id, m.destinataire_email,
              d.nom_complet AS destinataire_nom,
              d.role        AS destinataire_role
       FROM public.messages m
       LEFT JOIN utilisateurs d ON m.destinataire_id = d.id
       WHERE m.expediteur_id = $1
       ORDER BY m.cree_le DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }

  /** Nombre de messages reçus non lus. */
  static async nonLus(userId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM public.messages WHERE destinataire_id = $1 AND est_lu = FALSE',
      [userId]
    );
    return rows[0]?.total ?? 0;
  }

  /** Marque un message reçu comme lu (seulement s'il appartient à l'utilisateur). */
  static async marquerLu(id, userId) {
    const { rows } = await pool.query(
      'UPDATE public.messages SET est_lu = TRUE WHERE id = $1 AND destinataire_id = $2 RETURNING *',
      [id, userId]
    );
    return rows[0];
  }

  /**
   * Annuaire : utilisateurs actifs (hors soi-même) pour le sélecteur de destinataire interne.
   * Ne retourne que des données non sensibles (id, nom, rôle, e-mail).
   * @param {number} excludeId - ID de l'utilisateur courant à exclure.
   */
  static async annuaire(excludeId) {
    const { rows } = await pool.query(
      `SELECT id, nom_complet, role, adresse_email
       FROM utilisateurs
       WHERE est_actif = TRUE AND id <> $1
       ORDER BY nom_complet ASC`,
      [excludeId]
    );
    return rows;
  }

  /** Récupère l'e-mail d'un utilisateur (pour l'option « copie par e-mail »). */
  static async emailUtilisateur(id) {
    const { rows } = await pool.query('SELECT adresse_email FROM utilisateurs WHERE id = $1', [id]);
    return rows[0]?.adresse_email || null;
  }
}

module.exports = Message;
