// controllers/bonSortieController.js
const BonSortie = require('../models/BonSortie');
const { verifierSeuilCritique } = require('../services/stockService');

/**
 * @function getAllBonsSortie
 * @description Historique paginé des bons de sortie (avec nombre de lignes).
 */
exports.getAllBonsSortie = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();

    const { rows, total } = await BonSortie.findPaginated({ page, limit, search });
    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      metadata: {
        total_items:       total,
        total_pages:       totalPages,
        current_page:      page,
        per_page:          limit,
        has_next_page:     page < totalPages,
        has_previous_page: page > 1,
      },
      bons_sortie: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllBonsSortie):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getBonSortieById
 * @description Détail d'un bon de sortie avec ses lignes (actifs sortis).
 */
exports.getBonSortieById = async (req, res) => {
  try {
    const bon = await BonSortie.findById(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon de sortie non trouvé.' });
    res.status(200).json(bon);
  } catch (error) {
    console.error('Erreur (getBonSortieById):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function createBonSortie
 * @description Crée un bon de sortie qui sort PLUSIEURS actifs en une transaction
 * (chaque actif = une ligne = un mouvement de sortie). Vérifie les seuils critiques après coup.
 */
exports.createBonSortie = async (req, res) => {
  try {
    const { destinataire, notes, actif_ids } = req.body;

    const { bon, lignes, produitsEntrepots } = await BonSortie.createWithLignes({
      destinataire: destinataire || null,
      notes:        notes || null,
      effectue_par: req.utilisateur?.id ?? null,
      actif_ids:    actif_ids || [],
    });

    // Vérification des seuils critiques (non bloquant) pour chaque couple produit/entrepôt impacté.
    const dejaVus = new Set();
    for (const { produit_id, entrepot_id } of produitsEntrepots) {
      const cle = `${produit_id}-${entrepot_id}`;
      if (dejaVus.has(cle)) continue;
      dejaVus.add(cle);
      verifierSeuilCritique(produit_id, entrepot_id)
        .catch(err => console.error('❌ Vérif seuil critique (bon de sortie):', err));
    }

    res.status(201).json({
      message: `Bon de sortie ${bon.reference} créé : ${lignes.length} actif(s) sorti(s).`,
      bon,
      nb_lignes: lignes.length,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 400) return res.status(400).json({ message: error.message });
    console.error('Erreur (createBonSortie):', error);
    res.status(500).json({ message: 'Erreur lors de la création du bon de sortie.' });
  }
};

/**
 * @function deleteBonSortie
 * @description Supprime l'en-tête d'un bon de sortie (les mouvements liés sont conservés).
 */
exports.deleteBonSortie = async (req, res) => {
  try {
    const ok = await BonSortie.delete(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Bon de sortie non trouvé ou déjà supprimé.' });
    res.status(200).json({ message: 'Bon de sortie supprimé.' });
  } catch (error) {
    console.error('Erreur (deleteBonSortie):', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du bon de sortie.' });
  }
};
