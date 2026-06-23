// models/Produit.js
const pool = require('../config/db');

/**
 * @class Produit
 * @description Classe représentant le modèle Produit pour interagir avec la table "produits".
 */
class Produit {
  /**
   * Récupère tous les produits.
   * @returns {Promise<Array>} Liste des produits.
   */
  static async findAll() {
    const query = 'SELECT * FROM produits ORDER BY cree_le DESC';
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Récupère une page de produits (pagination + recherche côté serveur).
   * @param {Object} opts - { page, limit, search }
   * @returns {Promise<{rows: Array, total: number}>} La page et le total filtré.
   */
  static async findPaginated({ page = 1, limit = 10, search = '', categorieId = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const clauses = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      clauses.push(`(p.libelle ILIKE $${i} OR p.sku ILIKE $${i})`);
    }
    if (categorieId) {
      params.push(categorieId);
      clauses.push(`p.categorie_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS total FROM produits p ${where}`, params);

    const dataParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT p.*, c.nom AS categorie_nom, f.nom AS fournisseur_nom
       FROM produits p
       LEFT JOIN categories c   ON p.categorie_id   = c.id
       LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
       ${where}
       ORDER BY p.cree_le DESC, p.id DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );
    return { rows, total: cnt[0].total };
  }

  /**
   * Récupère un produit par son ID.
   * @param {number} id - L'identifiant du produit.
   * @returns {Promise<Object>} Le produit trouvé.
   */
  static async findById(id) {
    const query = 'SELECT * FROM produits WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  /**
   * Crée un nouveau produit.
   * @param {Object} data - Les données du produit.
   * @returns {Promise<Object>} Le produit créé avec son ID généré.
   */
  static async create(data) {
    const query = `
      INSERT INTO produits
      (categorie_id, fournisseur_id, libelle, sku, image_url, stock_minimum, stock_critique, est_maintenable, intervalle_valeur, intervalle_unite, cree_par)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const values = [
      data.categorie_id, data.fournisseur_id, data.libelle, data.sku,
      data.image_url, data.stock_minimum, data.stock_critique,
      data.est_maintenable, data.intervalle_valeur, data.intervalle_unite, data.cree_par
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Met à jour un produit existant.
   * @param {number} id - L'identifiant du produit à mettre à jour.
   * @param {Object} data - Les nouvelles données.
   * @returns {Promise<Object>} Le produit mis à jour.
   */
  static async update(id, data) {
    const query = `
      UPDATE produits
      SET categorie_id = $1, fournisseur_id = $2, libelle = $3, sku = $4,
          image_url = $5, stock_minimum = $6, stock_critique = $7,
          est_maintenable = $8, intervalle_valeur = $9, intervalle_unite = $10, modifie_par = $11
      WHERE id = $12
      RETURNING *;
    `;
    const values = [
      data.categorie_id, data.fournisseur_id, data.libelle, data.sku,
      data.image_url, data.stock_minimum, data.stock_critique,
      data.est_maintenable, data.intervalle_valeur, data.intervalle_unite, data.modifie_par, id
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Supprime un produit par son ID.
   * @param {number} id - L'identifiant du produit.
   * @returns {Promise<boolean>} True si supprimé, False sinon.
   */
  static async delete(id) {
    const query = 'DELETE FROM produits WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }
}

module.exports = Produit;