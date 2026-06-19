// services/stockService.js
const pool = require('../config/db');

/**
 * @function ajusterStock
 * @description Met à jour (incrément/décrément) la quantité en stock d'un produit
 * dans un entrepôt donné. Crée la ligne de stock si elle n'existe pas encore.
 * Source de vérité unique partagée par la création d'actifs et les mouvements.
 *
 * @param {number} produitId  - ID du produit concerné.
 * @param {number} entrepotId - ID de l'entrepôt concerné.
 * @param {number} delta      - Variation à appliquer (+1 entrée, -1 sortie...).
 * @returns {Promise<number|null>} La nouvelle quantité en stock, ou null si non applicable.
 */
async function ajusterStock(produitId, entrepotId, delta) {
  if (!produitId || !entrepotId || !delta) return null;

  const { rows } = await pool.query(
    'SELECT id, quantite FROM stocks WHERE produit_id = $1 AND entrepot_id = $2',
    [produitId, entrepotId]
  );

  if (rows.length > 0) {
    const nouvelleQuantite = Math.max(rows[0].quantite + delta, 0);
    await pool.query(
      'UPDATE stocks SET quantite = $1, mis_a_jour_le = CURRENT_TIMESTAMP WHERE id = $2',
      [nouvelleQuantite, rows[0].id]
    );
    return nouvelleQuantite;
  }

  // Pas de ligne existante : on en crée une (quantité plancher à 0)
  const quantiteInitiale = Math.max(delta, 0);
  await pool.query(
    'INSERT INTO stocks (produit_id, entrepot_id, quantite) VALUES ($1, $2, $3)',
    [produitId, entrepotId, quantiteInitiale]
  );
  return quantiteInitiale;
}

module.exports = { ajusterStock };
