const pool = require('../config/db');

/**
 * @class Entrepot
 * @description Modèle pour interagir avec la table "entrepots" de la base de données.
 */
class Entrepot {
  /**
   * Récupère la liste de tous les entrepôts.
   * @returns {Promise<Array>} Tableau d'objets représentant les entrepôts.
   */
  static async findAll() {
    const query = 'SELECT * FROM entrepots ORDER BY cree_le DESC';
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Récupère un entrepôt spécifique par son ID.
   * @param {number|string} id - L'identifiant de l'entrepôt.
   * @returns {Promise<Object>} L'entrepôt trouvé ou undefined.
   */
  static async findById(id) {
    const query = 'SELECT * FROM entrepots WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  /**
   * Crée un nouvel entrepôt.
   * @param {Object} data - Les données de l'entrepôt.
   * @param {string} data.nom - Le nom de l'entrepôt.
   * @param {string} [data.adresse] - L'adresse physique.
   * @param {boolean} [data.est_actif=true] - Le statut de l'entrepôt.
   * @returns {Promise<Object>} L'entrepôt nouvellement créé.
   */
  static async create(data) {
    const query = `
      INSERT INTO entrepots (nom, adresse, est_actif) 
      VALUES ($1, $2, COALESCE($3, true)) 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [data.nom, data.adresse, data.est_actif]);
    return rows[0];
  }

  /**
   * Met à jour un entrepôt existant.
   * @param {number|string} id - L'ID de l'entrepôt à modifier.
   * @param {Object} data - Les nouvelles données.
   * @returns {Promise<Object>} L'entrepôt mis à jour.
   */
  static async update(id, data) {
    const query = `
      UPDATE entrepots 
      SET nom = $1, adresse = $2, est_actif = $3 
      WHERE id = $4 
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [data.nom, data.adresse, data.est_actif, id]);
    return rows[0];
  }

  /**
   * Supprime un entrepôt (Attention aux contraintes de clés étrangères).
   * @param {number|string} id - L'identifiant de l'entrepôt.
   * @returns {Promise<boolean>} True si la suppression a réussi.
   */
  static async delete(id) {
    const query = 'DELETE FROM entrepots WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }
}

module.exports = Entrepot;