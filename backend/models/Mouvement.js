const pool = require('../config/db');

/**
 * @class Mouvement
 * @description Modèle pour interagir avec la table "mouvements" (historique des entrées/sorties).
 */
class Mouvement {
  static async findAll() {
    const query = `
      SELECT m.*, a.numero_serie, u.nom_complet AS effectue_par_nom
      FROM mouvements m
      LEFT JOIN actifs a ON m.actif_id = a.id
      LEFT JOIN utilisateurs u ON m.effectue_par = u.id
      ORDER BY m.cree_le DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async create(data) {
    const query = `
      INSERT INTO mouvements (actif_id, effectue_par, entrepot_id, type_mouvement, notes) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `;
    const values = [data.actif_id, data.effectue_par, data.entrepot_id, data.type_mouvement, data.notes];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}
module.exports = Mouvement;