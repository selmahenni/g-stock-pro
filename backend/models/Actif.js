const pool = require('../config/db');

/**
 * @class Actif
 * @description Modèle pour interagir avec la table "actifs" (le matériel physique unitaire).
 */
class Actif {
  /**
   * Récupère tous les actifs avec les détails joints (produit et entrepôt).
   * @returns {Promise<Array>} Liste des actifs enrichis.
   */
  static async findAll() {
    // Une jointure SQL classique pour ramener le nom du produit et de l'entrepôt
    const query = `
      SELECT a.*, p.libelle AS produit_libelle, e.nom AS entrepot_nom 
      FROM actifs a
      LEFT JOIN produits p ON a.produit_id = p.id
      LEFT JOIN entrepots e ON a.entrepot_id = e.id
      ORDER BY a.cree_le DESC, a.id DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Récupère une page d'actifs (pagination + recherche côté serveur, avec jointures).
   * @param {Object} opts - { page, limit, search }
   * @returns {Promise<{rows: Array, total: number}>}
   */
  static async findPaginated({ page = 1, limit = 10, search = '', produitId = null, statut = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const clauses = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      clauses.push(`(a.numero_serie ILIKE $${i} OR p.libelle ILIKE $${i} OR a.statut ILIKE $${i})`);
    }
    if (produitId) {
      params.push(produitId);
      clauses.push(`a.produit_id = $${params.length}`);
    }
    if (statut) {
      params.push(statut);
      clauses.push(`a.statut = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM actifs a LEFT JOIN produits p ON a.produit_id = p.id ${where}`,
      params
    );

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT a.*, p.libelle AS produit_libelle, e.nom AS entrepot_nom
       FROM actifs a
       LEFT JOIN produits p  ON a.produit_id  = p.id
       LEFT JOIN entrepots e ON a.entrepot_id = e.id
       ${where}
       ORDER BY a.cree_le DESC, a.id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    return { rows, total: cnt[0].total };
  }

  /**
   * Crée un nouvel actif (ex: lors de la réception d'une commande).
   * @param {Object} data - Les données de l'actif.
   * @returns {Promise<Object>} L'actif créé.
   */
  static async create(data) {
    const query = `
      INSERT INTO actifs (produit_id, numero_serie, entrepot_id, emplacement, utilisateur_affecte_id, statut, prix_unitaire, cree_par)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'en_stock'), $7, $8)
      RETURNING *;
    `;
    const values = [
      data.produit_id,
      data.numero_serie,
      data.entrepot_id,
      data.emplacement,
      data.utilisateur_affecte_id,
      data.statut,
      data.prix_unitaire,
      data.cree_par
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Récupère un actif par son identifiant, avec les détails joints.
   * @param {number|string} id - L'ID de l'actif.
   * @returns {Promise<Object|undefined>} L'actif trouvé ou undefined.
   */
  static async findById(id) {
    const query = `
      SELECT a.*, p.libelle AS produit_libelle, p.est_maintenable, e.nom AS entrepot_nom
      FROM actifs a
      LEFT JOIN produits p   ON a.produit_id  = p.id
      LEFT JOIN entrepots e  ON a.entrepot_id = e.id
      WHERE a.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  /**
   * Récupère un actif par son NUMÉRO DE SÉRIE exact (insensible à la casse), avec jointures.
   * Utilisé par le scan (audit d'inventaire).
   * @param {string} numero - Le numéro de série.
   * @returns {Promise<Object|undefined>}
   */
  static async findBySerie(numero) {
    const query = `
      SELECT a.*, p.libelle AS produit_libelle, e.nom AS entrepot_nom
      FROM actifs a
      LEFT JOIN produits p   ON a.produit_id  = p.id
      LEFT JOIN entrepots e  ON a.entrepot_id = e.id
      WHERE LOWER(a.numero_serie) = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [numero]);
    return rows[0];
  }

  /**
   * Met à jour le statut et l'affectation d'un actif (ex: distribution à un employé).
   * @param {number|string} id - L'ID de l'actif.
   * @param {Object} data - Les données à mettre à jour.
   * @returns {Promise<Object>} L'actif mis à jour.
   */
  static async update(id, data) {
    const query = `
      UPDATE actifs
      SET produit_id = $1, numero_serie = $2, entrepot_id = $3, emplacement = $4,
          utilisateur_affecte_id = $5, statut = $6, prix_unitaire = $7, modifie_par = $8
      WHERE id = $9
      RETURNING *;
    `;
    const values = [
      data.produit_id, data.numero_serie, data.entrepot_id, data.emplacement,
      data.utilisateur_affecte_id, data.statut, data.prix_unitaire, data.modifie_par, id
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Met à jour uniquement le statut d'un actif (cycle de maintenance).
   * @param {number|string} id - L'ID de l'actif.
   * @param {string} statut - Nouveau statut ('en_stock'|'affecte'|'maintenance'|'rebut').
   * @returns {Promise<Object|undefined>} L'actif mis à jour.
   */
  static async setStatut(id, statut) {
    const { rows } = await pool.query(
      'UPDATE actifs SET statut = $1 WHERE id = $2 RETURNING *',
      [statut, id]
    );
    return rows[0];
  }

  /**
   * Définit la date de prochaine maintenance préventive d'un actif.
   * @param {number|string} id - L'ID de l'actif.
   * @param {Date|string|null} date - La date calculée (ou null pour effacer).
   * @returns {Promise<Object|undefined>} L'actif mis à jour.
   */
  static async setProchainePreventive(id, date) {
    const { rows } = await pool.query(
      'UPDATE actifs SET date_prochaine_preventive = $1 WHERE id = $2 RETURNING *',
      [date, id]
    );
    return rows[0];
  }

  /**
   * Supprime un actif du parc matériel.
   * @param {number|string} id - L'identifiant de l'actif.
   * @returns {Promise<boolean>} true si la suppression a réussi.
   */
  static async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM actifs WHERE id = $1 RETURNING id',
      [id]
    );
    return rows.length > 0;
  }
}

module.exports = Actif;