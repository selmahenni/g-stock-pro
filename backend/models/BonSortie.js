// models/BonSortie.js
const pool = require('../config/db');
const { ajusterStock } = require('../services/stockService');

/**
 * @class BonSortie
 * @description En-tête « bon de sortie » regroupant plusieurs sorties d'actifs.
 * Chaque ligne du bon est un mouvement de type 'sortie' (table mouvements) rattaché
 * via la colonne bon_sortie_id. Les sorties unitaires (bon_sortie_id NULL) ne sont
 * pas concernées par ce modèle.
 */
class BonSortie {
  /**
   * Page de bons de sortie (pagination + recherche), avec le nombre de lignes et l'auteur.
   * @param {Object} opts - { page, limit, search }
   * @returns {Promise<{rows: Array, total: number}>}
   */
  static async findPaginated({ page = 1, limit = 10, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const clauses = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      clauses.push(`(b.reference ILIKE $${i} OR b.destinataire ILIKE $${i} OR u.nom_complet ILIKE $${i})`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const joins = `
      FROM bons_sortie b
      LEFT JOIN utilisateurs u ON b.effectue_par = u.id`;

    const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS total ${joins} ${where}`, params);
    const dp = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT b.*,
              u.nom_complet AS effectue_par_nom,
              (SELECT COUNT(*)::int FROM mouvements m WHERE m.bon_sortie_id = b.id) AS nb_lignes
       ${joins} ${where}
       ORDER BY b.cree_le DESC, b.id DESC
       LIMIT $${dp.length - 1} OFFSET $${dp.length}`,
      dp
    );
    return { rows, total: cnt[0].total };
  }

  /**
   * Récupère un bon de sortie avec ses lignes (actifs sortis).
   * @param {number|string} id
   * @returns {Promise<Object|undefined>} { ...bon, effectue_par_nom, lignes: [...] }
   */
  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT b.*, u.nom_complet AS effectue_par_nom
       FROM bons_sortie b
       LEFT JOIN utilisateurs u ON b.effectue_par = u.id
       WHERE b.id = $1`,
      [id]
    );
    const bon = rows[0];
    if (!bon) return undefined;

    const { rows: lignes } = await pool.query(
      `SELECT m.id AS mouvement_id, m.actif_id, m.cree_le,
              a.numero_serie,
              p.libelle AS produit_libelle,
              e.nom     AS entrepot_nom
       FROM mouvements m
       LEFT JOIN actifs a    ON m.actif_id   = a.id
       LEFT JOIN produits p  ON a.produit_id = p.id
       LEFT JOIN entrepots e ON m.entrepot_id = e.id
       WHERE m.bon_sortie_id = $1
       ORDER BY m.id ASC`,
      [id]
    );
    bon.lignes = lignes;
    return bon;
  }

  /**
   * Crée un bon de sortie ET ses lignes en une seule TRANSACTION :
   * pour chaque actif éligible (en stock), enregistre un mouvement de sortie,
   * décrémente le stock et bascule l'actif en « affecté ». Tout est annulé en cas d'erreur.
   * @param {Object} data - { destinataire?, notes?, effectue_par?, actif_ids: number[] }
   * @returns {Promise<{bon: Object, lignes: Array, produitsEntrepots: Array}>}
   */
  static async createWithLignes({ destinataire = null, notes = null, effectue_par = null, actif_ids = [] }) {
    const ids = [...new Set((actif_ids || []).map(Number).filter(Boolean))];
    if (ids.length === 0) {
      const err = new Error('Sélectionnez au moins un actif à sortir.');
      err.statusCode = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verrouille et valide les actifs : ils doivent exister et être en stock.
      const { rows: actifs } = await client.query(
        `SELECT a.id, a.produit_id, a.entrepot_id, a.statut, a.numero_serie
         FROM actifs a
         WHERE a.id = ANY($1::bigint[])
         FOR UPDATE`,
        [ids]
      );

      if (actifs.length !== ids.length) {
        const err = new Error('Un ou plusieurs actifs sélectionnés sont introuvables.');
        err.statusCode = 400;
        throw err;
      }
      const nonEligibles = actifs.filter(a => a.statut !== 'en_stock');
      if (nonEligibles.length > 0) {
        const err = new Error(`Actif(s) non disponible(s) en stock : ${nonEligibles.map(a => a.numero_serie).join(', ')}.`);
        err.statusCode = 400;
        throw err;
      }

      // 1) En-tête (référence calculée après obtention de l'id)
      const { rows: ins } = await client.query(
        `INSERT INTO bons_sortie (reference, destinataire, notes, effectue_par)
         VALUES (NULL, $1, $2, $3) RETURNING *`,
        [destinataire, notes, effectue_par]
      );
      const bon = ins[0];
      const reference = `BS-${String(bon.id).padStart(5, '0')}`;
      await client.query('UPDATE bons_sortie SET reference = $1 WHERE id = $2', [reference, bon.id]);
      bon.reference = reference;

      // 2) Une ligne (mouvement de sortie) par actif + ajustement de stock + statut
      const lignes = [];
      const produitsEntrepots = [];
      for (const a of actifs) {
        const { rows: mv } = await client.query(
          `INSERT INTO mouvements (actif_id, effectue_par, entrepot_id, type_mouvement, notes, destinataire, bon_sortie_id)
           VALUES ($1, $2, $3, 'sortie', $4, $5, $6) RETURNING *`,
          [a.id, effectue_par, a.entrepot_id, notes, destinataire, bon.id]
        );
        if (a.entrepot_id) {
          await ajusterStock(a.produit_id, a.entrepot_id, -1, client);
          produitsEntrepots.push({ produit_id: a.produit_id, entrepot_id: a.entrepot_id });
        }
        await client.query("UPDATE actifs SET statut = 'affecte' WHERE id = $1", [a.id]);
        lignes.push(mv[0]);
      }

      await client.query('COMMIT');
      return { bon, lignes, produitsEntrepots };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Supprime un bon de sortie (l'en-tête uniquement). Les mouvements liés voient leur
   * bon_sortie_id remis à NULL (ON DELETE SET NULL) : l'historique de stock est préservé.
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const { rows } = await pool.query('DELETE FROM bons_sortie WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  }
}

module.exports = BonSortie;
