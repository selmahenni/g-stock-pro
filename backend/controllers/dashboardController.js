// controllers/dashboardController.js
const pool = require('../config/db');

/**
 * @function getStats
 * @description Agrégats du tableau de bord, calculés par des requêtes SQL performantes
 * (COUNT/SUM/GROUP BY indexés) plutôt qu'en mémoire.
 */
exports.getStats = async (req, res) => {
  try {
    const [
      globaux,
      actifsParStatut,
      alertes,
      maintenance,
      fluxMensuel,
      actifsParCategorie,
    ] = await Promise.all([
      // KPIs globaux en une seule requête
      pool.query(`
        SELECT
          (SELECT COALESCE(SUM(quantite), 0) FROM stocks)                         AS stock_total,
          (SELECT COUNT(*) FROM produits)                                         AS produits_total,
          (SELECT COUNT(*) FROM actifs)                                           AS actifs_total,
          (SELECT COUNT(*) FROM entrepots)                                        AS entrepots_total,
          (SELECT COALESCE(SUM(prix_unitaire), 0) FROM actifs)                    AS valeur_parc,
          (SELECT COUNT(*) FROM actifs WHERE statut = 'maintenance')              AS actifs_en_maintenance,
          (SELECT COUNT(*) FROM actifs WHERE date_prochaine_preventive IS NOT NULL
                                          AND date_prochaine_preventive <= NOW()) AS preventives_dues,
          (SELECT COUNT(*) FROM maintenances WHERE statut = 'en_cours')           AS tickets_en_cours,
          (SELECT COUNT(*) FROM stocks s JOIN produits p ON s.produit_id = p.id
             WHERE p.stock_critique IS NOT NULL AND p.stock_critique > 0
               AND s.quantite <= p.stock_critique)                                AS alertes_achat
      `),
      // Répartition des actifs par statut
      pool.query(`SELECT statut, COUNT(*)::int AS total FROM actifs GROUP BY statut`),
      // Alertes d'achat : lignes de stock sous le seuil critique
      pool.query(`
        SELECT s.id, s.quantite, p.libelle AS produit_libelle, p.stock_critique, e.nom AS entrepot_nom
        FROM stocks s
        JOIN produits p   ON s.produit_id  = p.id
        LEFT JOIN entrepots e ON s.entrepot_id = e.id
        WHERE p.stock_critique IS NOT NULL AND p.stock_critique > 0 AND s.quantite <= p.stock_critique
        ORDER BY s.quantite ASC
        LIMIT 8
      `),
      // Derniers tickets de maintenance (aperçu)
      pool.query(`
        SELECT m.id, m.type_maintenance, m.statut, m.date_intervention, a.numero_serie
        FROM maintenances m
        LEFT JOIN actifs a ON m.actif_id = a.id
        ORDER BY m.cree_le DESC
        LIMIT 6
      `),
      // Flux mensuel entrées vs sorties sur les 12 derniers mois.
      // generate_series garantit 12 points (mois vides = 0) pour un histogramme continu.
      pool.query(`
        SELECT
          to_char(g.mois, 'YYYY-MM')                                          AS mois,
          COUNT(*) FILTER (WHERE m.type_mouvement = 'entree')::int            AS entrees,
          COUNT(*) FILTER (WHERE m.type_mouvement = 'sortie')::int            AS sorties
        FROM generate_series(
               date_trunc('month', NOW()) - INTERVAL '11 months',
               date_trunc('month', NOW()),
               INTERVAL '1 month'
             ) AS g(mois)
        LEFT JOIN mouvements m ON date_trunc('month', m.cree_le) = g.mois
        GROUP BY g.mois
        ORDER BY g.mois
      `),
      // Répartition des actifs par catégorie de produit (pour le donut)
      pool.query(`
        SELECT COALESCE(c.nom, 'Sans catégorie') AS categorie, COUNT(*)::int AS total
        FROM actifs a
        LEFT JOIN produits   p ON a.produit_id  = p.id
        LEFT JOIN categories c ON p.categorie_id = c.id
        GROUP BY COALESCE(c.nom, 'Sans catégorie')
        ORDER BY total DESC
      `),
    ]);

    const g = globaux.rows[0];
    res.status(200).json({
      kpis: {
        stock_total:            Number(g.stock_total),
        produits_total:         Number(g.produits_total),
        actifs_total:           Number(g.actifs_total),
        entrepots_total:        Number(g.entrepots_total),
        valeur_parc:            Number(g.valeur_parc),
        actifs_en_maintenance:  Number(g.actifs_en_maintenance),
        preventives_dues:       Number(g.preventives_dues),
        tickets_en_cours:       Number(g.tickets_en_cours),
        alertes_achat:          Number(g.alertes_achat),
      },
      actifs_par_statut:    actifsParStatut.rows,
      alertes_achat:        alertes.rows,
      derniers_tickets:     maintenance.rows,
      flux_mensuel:         fluxMensuel.rows,
      actifs_par_categorie: actifsParCategorie.rows,
    });
  } catch (error) {
    console.error('Erreur (dashboard getStats):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};
