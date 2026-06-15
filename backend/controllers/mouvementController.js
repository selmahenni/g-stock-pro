// controllers/mouvementController.js
const Mouvement = require('../models/Mouvement');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');

exports.getAllMouvements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const tousLesMouvements = await Mouvement.findAll();

    const totalItems = tousLesMouvements.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const mouvementsPagines = tousLesMouvements.slice(startIndex, endIndex);

    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      mouvements: mouvementsPagines
    });
  } catch (error) { 
    console.error('Erreur lors de la récupération des mouvements:', error);
    res.status(500).json({ message: 'Erreur serveur interne' }); 
  }
};

exports.createMouvement = async (req, res) => {
  try {
    // 1. On extrait le type_mouvement en plus pour nos calculs
    const { actif_id, entrepot_id, type_mouvement } = req.body;

    // 2. Enregistrement du mouvement en base de données
    const nouveauMouvement = await Mouvement.create(req.body);

    // 3. LOGIQUE GLOBALE (Mise à jour Stock + Notification)
    if (actif_id && entrepot_id) {
      
      // A. Récupérer le produit lié à cet actif
      const infoProduitQuery = `
        SELECT a.produit_id, p.libelle, p.stock_critique 
        FROM actifs a
        JOIN produits p ON a.produit_id = p.id
        WHERE a.id = $1
      `;
      const { rows: produitRows } = await pool.query(infoProduitQuery, [actif_id]);

      if (produitRows.length > 0) {
        const produit = produitRows[0];

        // B. Chercher la ligne de stock existante pour ce produit et cet entrepôt
        const checkStockQuery = `SELECT id, quantite FROM stocks WHERE produit_id = $1 AND entrepot_id = $2`;
        const { rows: stockRows } = await pool.query(checkStockQuery, [produit.produit_id, entrepot_id]);
        
        let quantiteActuelle = 0;

        // C. Mise à jour de la table "stocks"
        if (stockRows.length > 0) {
          quantiteActuelle = stockRows[0].quantite;
          
          // Calcul (+1 si entrée, -1 si sortie) car on bouge un actif (1 unité)
          if (type_mouvement === 'entree') quantiteActuelle += 1;
          if (type_mouvement === 'sortie') quantiteActuelle -= 1;

          // Mise à jour en base
          await pool.query(
            `UPDATE stocks SET quantite = $1, mis_a_jour_le = CURRENT_TIMESTAMP WHERE id = $2`, 
            [quantiteActuelle, stockRows[0].id]
          );
        } else {
          // Si aucune ligne de stock n'existe, on la crée
          if (type_mouvement === 'entree') quantiteActuelle = 1;
          // (Si c'est une sortie, on laisse à 0 ou en négatif selon ta règle métier)
          
          await pool.query(
            `INSERT INTO stocks (produit_id, entrepot_id, quantite) VALUES ($1, $2, $3)`, 
            [produit.produit_id, entrepot_id, quantiteActuelle]
          );
        }

        // D. Comparaison avec le seuil critique pour la notification
        if (quantiteActuelle <= produit.stock_critique) {
          const emailsMagasiniers = ['super_admin@gstockpro.com', 'magasinier@gstockpro.com'];
          
          const produitPourAlerte = {
            libelle: produit.libelle,
            quantite_actuelle: quantiteActuelle,
            stock_critique: produit.stock_critique
          };

          notificationService.alerterRuptureStock(produitPourAlerte, emailsMagasiniers)
            .catch(err => console.error("❌ Erreur lors de l'envoi de l'alerte email:", err));
        }
      }
    }

    res.status(201).json({
      message: "Mouvement et stock mis à jour avec succès.",
      mouvement: nouveauMouvement
    });
  } catch (error) { 
    console.error('Erreur lors de l\'enregistrement du mouvement:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du mouvement.' }); 
  }
};