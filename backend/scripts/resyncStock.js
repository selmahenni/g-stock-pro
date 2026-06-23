// scripts/resyncStock.js
// Resynchronise stocks.quantite avec le nombre RÉEL d'actifs « en_stock »
// (par produit × entrepôt). Source de vérité = les actifs unitaires.
//   - met à jour les lignes existantes,
//   - met à 0 les lignes sans actif en stock,
//   - crée les lignes manquantes (actifs en stock sans ligne).
// Usage : node scripts/resyncStock.js
require('dotenv').config();
const pool = require('../config/db');

(async () => {
  const client = await pool.connect();
  try {
    // 1. Aperçu des écarts AVANT (lignes dont la quantité ne correspond pas au réel)
    const { rows: ecarts } = await client.query(`
      SELECT p.libelle AS produit, e.nom AS entrepot,
             s.quantite AS quantite_actuelle,
             COALESCE(c.n, 0) AS quantite_reelle
      FROM stocks s
      LEFT JOIN produits p  ON s.produit_id  = p.id
      LEFT JOIN entrepots e ON s.entrepot_id = e.id
      LEFT JOIN (
        SELECT produit_id, entrepot_id, COUNT(*)::int n
        FROM actifs WHERE statut = 'en_stock' GROUP BY 1, 2
      ) c ON c.produit_id = s.produit_id AND c.entrepot_id = s.entrepot_id
      WHERE s.quantite <> COALESCE(c.n, 0)
      ORDER BY produit
    `);
    console.log(`\n📋 ${ecarts.length} ligne(s) à corriger :`);
    ecarts.forEach(r => console.log(`   • ${r.produit} @ ${r.entrepot} : ${r.quantite_actuelle} → ${r.quantite_reelle}`));

    await client.query('BEGIN');

    // 2. Aligner les lignes existantes sur le compte réel d'actifs en_stock
    const u1 = await client.query(`
      UPDATE stocks s
      SET quantite = COALESCE(c.n, 0), mis_a_jour_le = NOW()
      FROM (SELECT produit_id, entrepot_id, COUNT(*)::int n FROM actifs WHERE statut = 'en_stock' GROUP BY 1, 2) c
      WHERE s.produit_id = c.produit_id AND s.entrepot_id = c.entrepot_id
        AND s.quantite <> c.n
    `);

    // 3. Lignes sans aucun actif en stock correspondant → quantité = 0
    const u2 = await client.query(`
      UPDATE stocks s
      SET quantite = 0, mis_a_jour_le = NOW()
      WHERE s.quantite <> 0
        AND NOT EXISTS (
          SELECT 1 FROM actifs a
          WHERE a.produit_id = s.produit_id AND a.entrepot_id = s.entrepot_id AND a.statut = 'en_stock'
        )
    `);

    // 4. Créer les lignes manquantes (actifs en stock sans ligne de stock)
    const ins = await client.query(`
      INSERT INTO stocks (produit_id, entrepot_id, quantite, mis_a_jour_le)
      SELECT a.produit_id, a.entrepot_id, COUNT(*)::int, NOW()
      FROM actifs a
      WHERE a.statut = 'en_stock' AND a.entrepot_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM stocks s WHERE s.produit_id = a.produit_id AND s.entrepot_id = a.entrepot_id)
      GROUP BY a.produit_id, a.entrepot_id
    `);

    await client.query('COMMIT');
    console.log(`\n✅ Resync OK : ${u1.rowCount} ligne(s) ajustée(s), ${u2.rowCount} remise(s) à 0, ${ins.rowCount} ligne(s) créée(s).`);

    // 5. Vérification : plus aucun écart
    const { rows: reste } = await client.query(`
      SELECT COUNT(*)::int AS n FROM stocks s
      LEFT JOIN (SELECT produit_id, entrepot_id, COUNT(*)::int n FROM actifs WHERE statut='en_stock' GROUP BY 1,2) c
        ON c.produit_id = s.produit_id AND c.entrepot_id = s.entrepot_id
      WHERE s.quantite <> COALESCE(c.n, 0)
    `);
    console.log(`🔎 Écarts restants : ${reste[0].n}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Resync échoué (rollback) :', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
