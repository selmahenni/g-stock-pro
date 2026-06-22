// models/Journal.js
const pool = require('../config/db');

/**
 * @class Journal
 * @description Journal de sécurité (audit) : trace les connexions, créations,
 * modifications et suppressions. Lecture réservée au super-administrateur.
 */
class Journal {
  /**
   * Enregistre une entrée d'audit.
   * @param {Object} data - { utilisateur_id, action, entite, entite_id, details }
   */
  static async create({ utilisateur_id, action, entite, entite_id, details }) {
    const { rows } = await pool.query(
      `INSERT INTO journaux (utilisateur_id, action, entite, entite_id, details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [utilisateur_id || null, action, entite || null, entite_id || null, details || null]
    );
    return rows[0];
  }

  /**
   * Liste paginée des entrées d'audit (les plus récentes d'abord) avec recherche.
   * @param {Object} opts - { page, limit, search }
   * @returns {Promise<{rows: Array, total: number}>}
   */
  static async findPaginated({ page = 1, limit = 20, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE (j.action ILIKE $1 OR j.entite ILIKE $1 OR j.details ILIKE $1 OR u.nom_complet ILIKE $1)`;
    }

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM journaux j LEFT JOIN utilisateurs u ON j.utilisateur_id = u.id ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT j.*, u.nom_complet AS utilisateur_nom, u.role AS utilisateur_role
       FROM journaux j
       LEFT JOIN utilisateurs u ON j.utilisateur_id = u.id
       ${where}
       ORDER BY j.cree_le DESC, j.id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    return { rows, total: cnt[0].total };
  }
}

module.exports = Journal;
