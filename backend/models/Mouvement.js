// models/Mouvement.js
const pool = require('../config/db');

/**
 * @class Mouvement
 * @description Modèle pour interagir avec la table "mouvements" (historique des entrées/sorties).
 */
class Mouvement {
  /**
   * Récupère tous les mouvements avec les détails de l'actif et de l'auteur.
   * @returns {Promise<Array>} Liste des mouvements enrichis.
   */
  static async findAll() {
    const query = `
      SELECT m.*, a.numero_serie,
             p.libelle AS produit_libelle,
             e.nom     AS entrepot_nom,
             u.nom_complet AS effectue_par_nom
      FROM mouvements m
      LEFT JOIN actifs a       ON m.actif_id      = a.id
      LEFT JOIN produits p     ON a.produit_id    = p.id
      LEFT JOIN entrepots e    ON m.entrepot_id   = e.id
      LEFT JOIN utilisateurs u ON m.effectue_par  = u.id
      ORDER BY m.cree_le DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Récupère un mouvement par son identifiant.
   * @param {number|string} id - L'ID du mouvement.
   * @returns {Promise<Object|undefined>} Le mouvement trouvé ou undefined.
   */
  static async findById(id) {
    const query = `
      SELECT m.*, a.numero_serie, u.nom_complet AS effectue_par_nom
      FROM mouvements m
      LEFT JOIN actifs a       ON m.actif_id     = a.id
      LEFT JOIN utilisateurs u ON m.effectue_par = u.id
      WHERE m.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  /**
   * Enregistre un nouveau mouvement d'entrée ou de sortie.
   * @param {Object} data - Les données du mouvement.
   * @param {number} data.actif_id       - ID de l'actif concerné.
   * @param {number} data.effectue_par   - ID de l'utilisateur qui effectue le mouvement.
   * @param {number} data.entrepot_id    - ID de l'entrepôt source ou destination.
   * @param {string} data.type_mouvement - Type : 'entree' ou 'sortie'.
   * @param {string} [data.notes]        - Notes libres.
   * @returns {Promise<Object>} Le mouvement créé.
   */
  static async create(data) {
    const query = `
      INSERT INTO mouvements (actif_id, effectue_par, entrepot_id, type_mouvement, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      data.actif_id,
      data.effectue_par,
      data.entrepot_id,
      data.type_mouvement,
      data.notes || null,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Met à jour un mouvement existant (ex: corriger des notes).
   * À utiliser avec précaution pour préserver l'intégrité de l'audit.
   * @param {number|string} id - L'ID du mouvement.
   * @param {Object} data - Les données à corriger.
   * @returns {Promise<Object|undefined>} Le mouvement mis à jour ou undefined si non trouvé.
   */
  static async update(id, data) {
    const query = `
      UPDATE mouvements
      SET type_mouvement = COALESCE($1, type_mouvement),
          notes          = COALESCE($2, notes),
          entrepot_id    = COALESCE($3, entrepot_id)
      WHERE id = $4
      RETURNING *;
    `;
    const values = [
      data.type_mouvement || null,
      data.notes          || null,
      data.entrepot_id    || null,
      id,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  /**
   * Supprime un mouvement (réservé aux super_admins pour corriger des erreurs de saisie).
   * @param {number|string} id - L'identifiant du mouvement.
   * @returns {Promise<boolean>} true si la suppression a réussi.
   */
  static async delete(id) {
    const { rows } = await pool.query(
      'DELETE FROM mouvements WHERE id = $1 RETURNING id',
      [id]
    );
    return rows.length > 0;
  }
}

module.exports = Mouvement;