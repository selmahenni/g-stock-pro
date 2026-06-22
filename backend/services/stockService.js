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
 * @description Vérifie le niveau de stock d'un produit dans un entrepôt et déclenche
 * l'alerte de seuil critique (notif + e-mail, ciblage géré par notificationService) si
 * la quantité est tombée à/sous le seuil critique du produit. Source UNIQUE de l'alerte,
 * appelée après toute baisse de stock (sortie de mouvement, suppression d'actif…).
 *
 * @param {number} produitId
 * @param {number} entrepotId
 * @param {Object} [db=pool] - Connexion (passer un client pour rester dans une transaction).
 * @returns {Promise<boolean>} true si une alerte a été déclenchée, false sinon.
 */
async function verifierSeuilCritique(produitId, entrepotId, db = pool) {
  if (!produitId || !entrepotId) return false;

  const { rows } = await db.query(
    `SELECT p.libelle, p.stock_critique, s.quantite
     FROM stocks s
     JOIN produits p ON s.produit_id = p.id
     WHERE s.produit_id = $1 AND s.entrepot_id = $2`,
    [produitId, entrepotId]
  );
  const r = rows[0];
  if (!r || r.stock_critique == null || r.stock_critique <= 0) return false;
  if (Number(r.quantite) > Number(r.stock_critique)) return false;

  // Seuil atteint / franchi → alerte (non bloquant)
  notificationService.alerterRuptureStock({
    libelle: r.libelle,
    quantite_actuelle: r.quantite,
    stock_critique: r.stock_critique,
  }).catch(err => console.error('❌ Alerte seuil critique échouée:', err));

  return true;
}

module.exports = { ajusterStock, verifierSeuilCritique };
