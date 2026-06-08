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
      (categorie_id, fournisseur_id, libelle, sku, prix_unitaire, stock_minimum, stock_critique, est_maintenable, intervalle_maintenance_jours) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *;
    `;
    const values = [
      data.categorie_id, data.fournisseur_id, data.libelle, data.sku, 
      data.prix_unitaire, data.stock_minimum, data.stock_critique, 
      data.est_maintenable, data.intervalle_maintenance_jours
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
          prix_unitaire = $5, stock_minimum = $6, stock_critique = $7, 
          est_maintenable = $8, intervalle_maintenance_jours = $9
      WHERE id = $10 
      RETURNING *;
    `;
    const values = [
      data.categorie_id, data.fournisseur_id, data.libelle, data.sku, 
      data.prix_unitaire, data.stock_minimum, data.stock_critique, 
      data.est_maintenable, data.intervalle_maintenance_jours, id
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