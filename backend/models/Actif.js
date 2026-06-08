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
      ORDER BY a.cree_le DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Crée un nouvel actif (ex: lors de la réception d'une commande).
   * @param {Object} data - Les données de l'actif.
   * @returns {Promise<Object>} L'actif créé.
   */
  static async create(data) {
    const query = `
      INSERT INTO actifs (produit_id, numero_serie, entrepot_id, emplacement, utilisateur_affecte_id, statut) 
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'en_stock')) 
      RETURNING *;
    `;
    const values = [
      data.produit_id, 
      data.numero_serie, 
      data.entrepot_id, 
      data.emplacement, 
      data.utilisateur_affecte_id, 
      data.statut
    ];
    const { rows } = await pool.query(query, values);
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
          utilisateur_affecte_id = $5, statut = $6 
      WHERE id = $7 
      RETURNING *;
    `;
    const values = [
      data.produit_id, data.numero_serie, data.entrepot_id, data.emplacement, 
      data.utilisateur_affecte_id, data.statut, id
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = Actif;