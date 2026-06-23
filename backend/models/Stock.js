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
  static async findPaginated({ page = 1, limit = 10, search = '', entrepotId = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const clauses = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      clauses.push(`(p.libelle ILIKE $${i} OR p.sku ILIKE $${i} OR e.nom ILIKE $${i} OR s.numero_lot ILIKE $${i}
                    OR EXISTS (SELECT 1 FROM actifs a
                               WHERE a.produit_id = s.produit_id AND a.entrepot_id = s.entrepot_id
                                 AND a.numero_serie ILIKE $${i}))`);
    }
    if (entrepotId) {
      params.push(entrepotId);
      clauses.push(`s.entrepot_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

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
              (SELECT string_agg(a.numero_serie, ', ' ORDER BY a.numero_serie)
                 FROM actifs a
                 WHERE a.produit_id = s.produit_id AND a.entrepot_id = s.entrepot_id
                   AND a.statut = 'en_stock') AS numeros_serie,
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
