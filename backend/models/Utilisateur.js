// backend/models/Utilisateur.js
const pool = require('../config/db');

/**
 * @class Utilisateur
 * @description Modèle pour interagir avec la table "utilisateurs".
 */
class Utilisateur {
  
  /**
   * Trouve un utilisateur par son adresse email (utilisé pour la connexion).
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  static async findByEmail(email) {
    const query = `
      SELECT id, role, nom_complet, adresse_email, hash_mot_de_passe, est_actif 
      FROM utilisateurs 
      WHERE adresse_email = $1
    `;
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  }

  /**
   * Récupère tous les utilisateurs (sans le hash du mot de passe).
   * @returns {Promise<Array>} Liste des utilisateurs.
   */
  static async findAll() {
    const query = 'SELECT id, role, nom_complet, adresse_email, est_actif, cree_le FROM utilisateurs ORDER BY cree_le DESC';
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Page d'utilisateurs (pagination + recherche + filtre rôle, côté serveur).
   * @param {Object} opts - { page, limit, search, role }
   * @returns {Promise<{rows: Array, total: number}>}
   */
  static async findPaginated({ page = 1, limit = 10, search = '', role = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const clauses = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      clauses.push(`(nom_complet ILIKE $${i} OR adresse_email ILIKE $${i} OR role ILIKE $${i})`);
    }
    if (role) {
      params.push(role);
      clauses.push(`role = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS total FROM utilisateurs ${where}`, params);
    const dp = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT id, role, nom_complet, adresse_email, est_actif, cree_le
       FROM utilisateurs ${where}
       ORDER BY cree_le DESC, id DESC
       LIMIT $${dp.length - 1} OFFSET $${dp.length}`,
      dp
    );
    return { rows, total: cnt[0].total };
  }

  /**
   * Récupère un utilisateur par son ID.
   * @param {string|number} id 
   * @returns {Promise<Object>}
   */
  static async findById(id) {
    const query = 'SELECT id, role, nom_complet, adresse_email, est_actif, cree_le FROM utilisateurs WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  /**
   * Crée un nouvel utilisateur.
   * @param {Object} data - Données (role, nom_complet, adresse_email, hash_mot_de_passe).
   * @returns {Promise<Object>}
   */
  static async create(data) {
    const query = `
      INSERT INTO utilisateurs (role, nom_complet, adresse_email, hash_mot_de_passe, est_actif) 
      VALUES ($1, $2, $3, $4, COALESCE($5, true)) 
      RETURNING id, role, nom_complet, adresse_email, est_actif, cree_le;
    `;
    const values = [
      data.role, 
      data.nom_complet, 
      data.adresse_email, 
      data.hash_mot_de_passe, 
      data.est_actif
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Met à jour un utilisateur.
   */
  static async update(id, data) {
    const query = `
      UPDATE utilisateurs 
      SET role = $1, nom_complet = $2, adresse_email = $3, est_actif = $4 
      WHERE id = $5 
      RETURNING id, role, nom_complet, adresse_email, est_actif, cree_le;
    `;
    const values = [data.role, data.nom_complet, data.adresse_email, data.est_actif, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Supprime un utilisateur.
   */
  static async delete(id) {
    const query = 'DELETE FROM utilisateurs WHERE id = $1 RETURNING id';
    const { rows } = await pool.query(query, [id]);
    return rows.length > 0;
  }
}

module.exports = Utilisateur;