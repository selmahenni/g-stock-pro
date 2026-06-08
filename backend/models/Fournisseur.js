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