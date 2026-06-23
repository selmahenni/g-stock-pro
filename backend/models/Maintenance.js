// models/Maintenance.js
const pool = require('../config/db');

/**
 * @class Maintenance
 * @description Modèle des "tickets" de maintenance (V2) appliqués à un actif unitaire.
 * Colonnes : id, actif_id, technicien_id, type_maintenance ('preventif'|'curatif'),
 * statut ('planifie'|'en_cours'|'termine'|'annule'), date_intervention, rapport, cout, cree_le.
 */
class Maintenance {
  /**
   * Liste tous les tickets, enrichis (actif, produit, technicien).
   * @returns {Promise<Array>}
   */
  static async findAll() {
    const query = `
      SELECT m.*,
             a.numero_serie AS actif_serie,
             p.libelle      AS produit_libelle,
             u.nom_complet  AS technicien_nom
      FROM maintenances m
      LEFT JOIN actifs a       ON m.actif_id      = a.id
      LEFT JOIN produits p     ON a.produit_id    = p.id
      LEFT JOIN utilisateurs u ON m.technicien_id = u.id
      ORDER BY m.cree_le DESC, m.id DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Page de tickets (pagination + recherche + filtres type/statut, côté serveur).
   * @param {Object} opts - { page, limit, search, type, statut }
   * @returns {Promise<{rows: Array, total: number}>}
   */
  static async findPaginated({ page = 1, limit = 10, search = '', type = null, statut = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const clauses = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      clauses.push(`(a.numero_serie ILIKE $${i} OR p.libelle ILIKE $${i} OR u.nom_complet ILIKE $${i})`);
    }
    if (type)   { params.push(type);   clauses.push(`m.type_maintenance = $${params.length}`); }
    if (statut) { params.push(statut); clauses.push(`m.statut = $${params.length}`); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const joins = `
      FROM maintenances m
      LEFT JOIN actifs a       ON m.actif_id      = a.id
      LEFT JOIN produits p     ON a.produit_id    = p.id
      LEFT JOIN utilisateurs u ON m.technicien_id = u.id`;

    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS total ${joins} ${where}`, params);
    const dp = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT m.*, a.numero_serie AS actif_serie, p.libelle AS produit_libelle, u.nom_complet AS technicien_nom
       ${joins} ${where}
       ORDER BY m.cree_le DESC, m.id DESC
       LIMIT $${dp.length - 1} OFFSET $${dp.length}`,
      dp
    );
    return { rows, total: cnt[0].total };
  }

  /**
   * Historique des tickets d'un actif (le plus récent d'abord).
   * @param {number|string} actifId
   * @returns {Promise<Array>}
   */
  static async findByActif(actifId) {
    const query = `
      SELECT m.*, u.nom_complet AS technicien_nom
      FROM maintenances m
      LEFT JOIN utilisateurs u ON m.technicien_id = u.id
      WHERE m.actif_id = $1
      ORDER BY m.cree_le DESC, m.id DESC
    `;
    const { rows } = await pool.query(query, [actifId]);
    return rows;
  }

  /**
   * Renvoie le ticket préventif ouvert (planifié ou en cours) d'un actif, s'il existe.
   * Sert d'anti-doublon pour le planificateur.
   * @param {number|string} actifId
   * @returns {Promise<Object|undefined>}
   */
  static async findOpenPreventive(actifId) {
    const query = `
      SELECT * FROM maintenances
      WHERE actif_id = $1 AND type_maintenance = 'preventif' AND statut IN ('planifie', 'en_cours')
      ORDER BY cree_le DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [actifId]);
    return rows[0];
  }

  /**
   * Récupère un ticket par son identifiant.
   * @param {number|string} id
   * @returns {Promise<Object|undefined>}
   */
  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM maintenances WHERE id = $1', [id]);
    return rows[0];
  }

  /**
   * Crée un ticket de maintenance.
   * @param {Object} data - { actif_id, technicien_id?, type_maintenance, statut?, date_intervention?, rapport?, cout? }
   * @returns {Promise<Object>}
   */
  static async create(data) {
    const query = `
      INSERT INTO maintenances
        (actif_id, technicien_id, type_maintenance, statut, date_intervention, rapport, cout)
      VALUES
        ($1, $2, $3, COALESCE($4, 'planifie'), COALESCE($5, CURRENT_DATE), $6, $7)
      RETURNING *;
    `;
    const values = [
      data.actif_id,
      data.technicien_id || null,
      data.type_maintenance,
      data.statut || null,
      data.date_intervention || null,
      data.rapport || null,
      data.cout ?? null,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Met à jour un ticket (statut, technicien, rapport, date, coût) — champs non fournis inchangés.
   * @param {number|string} id
   * @param {Object} data
   * @returns {Promise<Object|undefined>}
   */
  static async update(id, data) {
    const query = `
      UPDATE maintenances
      SET technicien_id     = COALESCE($1, technicien_id),
          statut            = COALESCE($2, statut),
          rapport           = COALESCE($3, rapport),
          date_intervention = COALESCE($4, date_intervention),
          cout              = COALESCE($5, cout)
      WHERE id = $6
      RETURNING *;
    `;
    const values = [
      data.technicien_id || null,
      data.statut        || null,
      data.rapport       || null,
      data.date_intervention || null,
      data.cout ?? null,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Supprime un ticket.
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const { rows } = await pool.query('DELETE FROM maintenances WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  }
}

module.exports = Maintenance;
