const pool = require('../config/db');

/**
 * @class Fournisseur
 * @description Modèle pour interagir avec la table "fournisseurs".
 */
class Fournisseur {
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM fournisseurs ORDER BY nom ASC');
    return rows;
  }

  /** Page de fournisseurs (pagination + recherche serveur). */
  static async findPaginated({ page = 1, limit = 10, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (search) { params.push(`%${search}%`); where = 'WHERE (nom ILIKE $1 OR adresse_email ILIKE $1 OR telephone ILIKE $1)'; }
    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS total FROM fournisseurs ${where}`, params);
    const dp = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM fournisseurs ${where} ORDER BY nom ASC, id ASC LIMIT $${dp.length - 1} OFFSET $${dp.length}`, dp);
    return { rows, total: cnt[0].total };
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM fournisseurs WHERE id = $1', [id]);
    return rows[0];
  }

  static async create(data) {
    const query = 'INSERT INTO fournisseurs (nom, adresse_email, telephone) VALUES ($1, $2, $3) RETURNING *;';
    const { rows } = await pool.query(query, [data.nom, data.adresse_email, data.telephone]);
    return rows[0];
  }

  static async update(id, data) {
    const query = 'UPDATE fournisseurs SET nom = $1, adresse_email = $2, telephone = $3 WHERE id = $4 RETURNING *;';
    const { rows } = await pool.query(query, [data.nom, data.adresse_email, data.telephone, id]);
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await pool.query('DELETE FROM fournisseurs WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  }
}

module.exports = Fournisseur;