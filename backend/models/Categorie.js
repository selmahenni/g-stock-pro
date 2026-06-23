const pool = require('../config/db');

/**
 * @class Categorie
 * @description Modèle pour interagir avec la table "categories".
 */
class Categorie {
  static async findAll() {
    const { rows } = await pool.query('SELECT * FROM categories ORDER BY nom ASC');
    return rows;
  }

  /** Page de catégories (pagination + recherche serveur). */
  static async findPaginated({ page = 1, limit = 10, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (search) { params.push(`%${search}%`); where = 'WHERE (nom ILIKE $1 OR description ILIKE $1)'; }
    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS total FROM categories ${where}`, params);
    const dp = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM categories ${where} ORDER BY nom ASC, id ASC LIMIT $${dp.length - 1} OFFSET $${dp.length}`, dp);
    return { rows, total: cnt[0].total };
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    return rows[0];
  }

  static async create(data) {
    const query = 'INSERT INTO categories (nom, description) VALUES ($1, $2) RETURNING *;';
    const { rows } = await pool.query(query, [data.nom, data.description]);
    return rows[0];
  }

  static async update(id, data) {
    const query = 'UPDATE categories SET nom = $1, description = $2 WHERE id = $3 RETURNING *;';
    const { rows } = await pool.query(query, [data.nom, data.description, id]);
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  }
}

module.exports = Categorie;