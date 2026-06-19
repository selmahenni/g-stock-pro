// models/Stock.js
const pool = require('../config/db');

/**
 * @class Stock
 * @description Accès aux lignes d'inventaire (table "stocks") : quantité d'un
 * produit dans un entrepôt. Inclut un indicateur d'alerte (sous seuil critique).
 */
class Stock {
  /**
   * Récupère une page de lignes d'inventaire (pagination + recherche serveur).
   * @param {Object} opts - { page, limit, search }
   * @returns {Promise<{rows: Array, total: number}>}
   */
  static async findPaginated({ page = 1, limit = 10, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE (p.libelle ILIKE $1 OR p.sku ILIKE $1 OR e.nom ILIKE $1 OR s.numero_lot ILIKE $1)`;
    }

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM stocks s
       LEFT JOIN produits p  ON s.produit_id  = p.id
       LEFT JOIN entrepots e ON s.entrepot_id = e.id
       ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT s.id, s.produit_id, s.entrepot_id, s.numero_lot, s.quantite, s.mis_a_jour_le,
              p.libelle AS produit_libelle, p.sku, p.stock_minimum, p.stock_critique,
              e.nom AS entrepot_nom,
              (p.stock_critique IS NOT NULL AND p.stock_critique > 0 AND s.quantite <= p.stock_critique) AS en_alerte
       FROM stocks s
       LEFT JOIN produits p  ON s.produit_id  = p.id
       LEFT JOIN entrepots e ON s.entrepot_id = e.id
       ${where}
       ORDER BY en_alerte DESC, s.mis_a_jour_le DESC NULLS LAST, s.id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    return { rows, total: cnt[0].total };
  }
}

module.exports = Stock;
