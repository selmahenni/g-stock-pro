const pool = require('../config/db');

/**
 * @class Utilisateur
 * @description Modèle pour interagir avec la table "utilisateurs".
 */
class Utilisateur {
  /**
   * Récupère tous les utilisateurs (sans le hash du mot de passe pour des raisons de sécurité).
   * @returns {Promise<Array>} Liste des utilisateurs.
   */
  static async findAll() {
    const query = 'SELECT id, role, nom_complet, adresse_email, est_actif, cree_le FROM utilisateurs ORDER BY cree_le DESC';
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Récupère un utilisateur par son ID.
   * @param {string|number} id - L'identifiant de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur trouvé.
   */
  static async findById(id) {
    const query = 'SELECT id, role, nom_complet, adresse_email, est_actif, cree_le FROM utilisateurs WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  /**
   * Crée un nouvel utilisateur.
   * @param {Object} data - Données de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur créé.
   */
  static async create(data) {
    const query = `
      INSERT INTO utilisateurs (role, nom_complet, adresse_email, hash_mot_de_passe, est_actif) 
      VALUES ($1, $2, $3, $4, COALESCE($5, true)) 
      RETURNING id, role, nom_complet, adresse_email, est_actif, cree_le;
    `;
    const values = [data.role, data.nom_complet, data.adresse_email, data.hash_mot_de_passe, data.est_actif];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Met à jour un utilisateur.
   * @param {string|number} id - L'ID de l'utilisateur.
   * @param {Object} data - Les nouvelles données.
   * @returns {Promise<Object>} L'utilisateur mis à jour.
   */
  static async update(id, data) {
    const query = `
      UPDATE utilisateurs 
      SET role = $1, nom_complet = $2, adresse_email = $3, est_actif = $4 
      WHERE id = $5 
      RETURNING id, role, nom_complet, adresse_email, est_actif, cree_le;
    `;
    const values = [data.role, data.nom_complet, data.adresse_email, data.est_actif, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Supprime un utilisateur.
   * @param {string|number} id - L'ID de l'utilisateur.
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const query = 'DELETE FROM utilisateurs WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }
}

module.exports = Utilisateur;