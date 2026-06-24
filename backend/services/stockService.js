// services/stockService.js
const pool = require('../config/db');
const notificationService = require('./notificationService');

/**
 * @function ajusterStock
 * @description Met à jour (incrément/décrément) la quantité en stock d'un produit
 * dans un entrepôt donné. Crée la ligne de stock si elle n'existe pas encore.
 * Source de vérité unique partagée par la création d'actifs et les mouvements.
 *
 * @param {number} produitId  - ID du produit concerné.
 * @param {number} entrepotId - ID de l'entrepôt concerné.
 * @param {number} delta      - Variation à appliquer (+1 entrée, -1 sortie, +N pour un lot...).
 * @param {Object} [db=pool]  - Connexion à utiliser (passer un client pour rester DANS une transaction).
 * @returns {Promise<number|null>} La nouvelle quantité en stock, ou null si non applicable.
 */
async function ajusterStock(produitId, entrepotId, delta, db = pool) {
  if (!produitId || !entrepotId || !delta) return null;

  const { rows } = await db.query(
    'SELECT id, quantite FROM stocks WHERE produit_id = $1 AND entrepot_id = $2',
    [produitId, entrepotId]
  );

  if (rows.length > 0) {
    const nouvelleQuantite = Math.max(rows[0].quantite + delta, 0);
    await db.query(
      'UPDATE stocks SET quantite = $1, mis_a_jour_le = CURRENT_TIMESTAMP WHERE id = $2',
      [nouvelleQuantite, rows[0].id]
    );
    return nouvelleQuantite;
  }

  // Pas de ligne existante : on en crée une (quantité plancher à 0)
  const quantiteInitiale = Math.max(delta, 0);
  await db.query(
    'INSERT INTO stocks (produit_id, entrepot_id, quantite) VALUES ($1, $2, $3)',
    [produitId, entrepotId, quantiteInitiale]
  );
  return quantiteInitiale;
}

/**
 * @function verifierSeuilCritique
 * @description Surveille le niveau de stock d'un produit dans un entrepôt et gère
 * l'alerte de seuil critique SANS SPAM : l'alerte (notif + e-mail) n'est envoyée
 * qu'UNE fois, au moment où le stock FRANCHIT le seuil (passage au-dessous). Un
 * drapeau `stocks.alerte_seuil_envoyee` mémorise l'état ; il est remis à zéro dès
 * que le stock repasse au-dessus du seuil → ré-armement pour la prochaine fois.
 * À appeler après TOUT mouvement de stock (baisse comme hausse) pour que l'état reste juste.
 *
 * @param {number} produitId
 * @param {number} entrepotId
 * @param {Object} [db=pool] - Connexion (passer un client pour rester dans une transaction).
 * @returns {Promise<boolean>} true si une alerte vient d'être déclenchée, false sinon.
 */
async function verifierSeuilCritique(produitId, entrepotId, db = pool) {
  if (!produitId || !entrepotId) return false;

  const { rows } = await db.query(
    `SELECT s.id, p.libelle, p.stock_critique, s.quantite, s.alerte_seuil_envoyee
     FROM stocks s
     JOIN produits p ON s.produit_id = p.id
     WHERE s.produit_id = $1 AND s.entrepot_id = $2`,
    [produitId, entrepotId]
  );
  const r = rows[0];
  if (!r) return false;

  const seuilDefini = r.stock_critique != null && Number(r.stock_critique) > 0;
  const sousSeuil = seuilDefini && Number(r.quantite) <= Number(r.stock_critique);

  if (sousSeuil) {
    // Déjà alerté pour cette descente → on ne renvoie rien (anti-spam).
    if (r.alerte_seuil_envoyee) return false;
    // Premier franchissement → on mémorise puis on alerte (non bloquant).
    await db.query('UPDATE stocks SET alerte_seuil_envoyee = TRUE WHERE id = $1', [r.id]);
    notificationService.alerterRuptureStock({
      libelle: r.libelle,
      quantite_actuelle: r.quantite,
      stock_critique: r.stock_critique,
    }).catch(err => console.error('❌ Alerte seuil critique échouée:', err));
    return true;
  }

  // Stock repassé au-dessus du seuil (ou seuil retiré) → ré-armement de l'alerte.
  if (r.alerte_seuil_envoyee) {
    await db.query('UPDATE stocks SET alerte_seuil_envoyee = FALSE WHERE id = $1', [r.id]);
  }
  return false;
}

module.exports = { ajusterStock, verifierSeuilCritique };
