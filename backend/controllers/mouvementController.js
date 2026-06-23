// controllers/mouvementController.js
const Mouvement = require('../models/Mouvement');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');
const { ajusterStock, verifierSeuilCritique } = require('../services/stockService');

/**
 * @function getAllMouvements
 * @description Récupère l'historique paginé de tous les mouvements d'entrée/sortie.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllMouvements = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const type = req.query.type || null; // 'entree' | 'sortie' | 'transfert'

    const { rows, total } = await Mouvement.findPaginated({ page, limit, search, type });
    const totalPages = Math.ceil(total / limit) || 1;

    const { rows: s } = await pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE type_mouvement='entree')::int    AS entrees,
             COUNT(*) FILTER (WHERE type_mouvement='sortie')::int     AS sorties,
             COUNT(*) FILTER (WHERE type_mouvement='transfert')::int  AS transferts
      FROM mouvements`);

    res.status(200).json({
      stats: s[0],
      metadata: {
        total_items:       total,
        total_pages:       totalPages,
        current_page:      page,
        per_page:          limit,
        has_next_page:     page < totalPages,
        has_previous_page: page > 1,
      },
      mouvements: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllMouvements):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getMouvementById
 * @description Récupère un mouvement spécifique par son identifiant.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getMouvementById = async (req, res) => {
  try {
    const { id } = req.params;
    const mouvement = await Mouvement.findById(id);

    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé.' });
    }

    res.status(200).json(mouvement);
  } catch (error) {
    console.error('Erreur (getMouvementById):', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @function createMouvement
 * @description Enregistre un nouveau mouvement et met à jour le stock correspondant.
 * Déclenche une alerte email si le stock passe sous le seuil critique.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.createMouvement = async (req, res) => {
  try {
    const { actif_id, type_mouvement } = req.body;

    // L'entrepôt n'est plus saisi : il est déduit de l'actif concerné.
    // On récupère aussi le produit lié (pour le stock et les alertes).
    let infoActif = null;
    if (actif_id) {
      const { rows } = await pool.query(
        `SELECT a.produit_id, a.entrepot_id, a.numero_serie, a.statut,
                p.libelle AS produit_libelle, p.stock_critique
         FROM actifs a
         JOIN produits p ON a.produit_id = p.id
         WHERE a.id = $1`,
        [actif_id]
      );
      infoActif = rows[0] || null;
    }

    // Entrepôt = celui de l'actif (ou, à défaut, celui éventuellement fourni)
    const entrepotId = infoActif?.entrepot_id ?? req.body.entrepot_id ?? null;

    // ── Cas TRANSFERT : déplacement d'un actif d'un entrepôt vers un autre ──
    if (type_mouvement === 'transfert') {
      if (!infoActif) {
        return res.status(400).json({ message: 'Actif introuvable pour le transfert.' });
      }
      const source = infoActif.entrepot_id;
      const destination = Number(req.body.entrepot_destination_id) || null;
      if (!destination) {
        return res.status(400).json({ message: 'Sélectionnez l\'entrepôt de destination.' });
      }
      if (destination === source) {
        return res.status(400).json({ message: 'L\'entrepôt de destination doit être différent de l\'entrepôt actuel.' });
      }

      // Transaction : stock source -1, stock destination +1, et l'actif change d'entrepôt.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: ins } = await client.query(
          `INSERT INTO mouvements (actif_id, effectue_par, entrepot_id, entrepot_destination_id, type_mouvement, notes, destinataire)
           VALUES ($1, $2, $3, $4, 'transfert', $5, $6) RETURNING *`,
          [actif_id, req.utilisateur?.id ?? null, source, destination, req.body.notes || null, req.body.destinataire || null]
        );
        await ajusterStock(infoActif.produit_id, source, -1, client);
        await ajusterStock(infoActif.produit_id, destination, +1, client);
        await client.query('UPDATE actifs SET entrepot_id = $1 WHERE id = $2', [destination, actif_id]);
        await client.query('COMMIT');

        // Le stock de la SOURCE a baissé → vérification du seuil critique (non bloquant).
        verifierSeuilCritique(infoActif.produit_id, source)
          .catch(err => console.error('❌ Vérif seuil critique (transfert):', err));

        return res.status(201).json({ message: 'Transfert effectué avec succès.', mouvement: ins[0] });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Erreur (transfert mouvement):', err);
        return res.status(500).json({ message: 'Erreur lors du transfert de l\'actif.' });
      } finally {
        client.release();
      }
    }

    // ── Cas ENTRÉE / SORTIE ──
    // Traçabilité : l'auteur du mouvement est l'utilisateur connecté (token)
    const nouveauMouvement = await Mouvement.create({
      ...req.body,
      entrepot_id:  entrepotId,
      effectue_par: req.utilisateur?.id ?? req.body.effectue_par ?? null,
    });

    // Mise à jour du stock et notifications
    if (infoActif && entrepotId) {
      // Incrément (entrée) / décrément (sortie) via le service de stock partagé
      const delta = type_mouvement === 'entree' ? +1 : type_mouvement === 'sortie' ? -1 : 0;
      const quantiteActuelle = await ajusterStock(infoActif.produit_id, entrepotId, delta) ?? 0;

      // Le STATUT de l'actif suit le mouvement :
      //  - sortie : l'actif quitte le stock → « affecté » (déployé / remis au destinataire),
      //  - entrée : l'actif revient → « en stock ».
      // (On ne réécrit pas un actif en maintenance/rebut : décisions à part.)
      if (type_mouvement === 'sortie' && infoActif.statut !== 'rebut') {
        await pool.query("UPDATE actifs SET statut = 'affecte' WHERE id = $1", [actif_id]);
      } else if (type_mouvement === 'entree' && infoActif.statut !== 'rebut') {
        await pool.query("UPDATE actifs SET statut = 'en_stock' WHERE id = $1", [actif_id]);
      }

      // Notification d'entrée en stock destinée aux magasiniers (in-app + email)
      if (type_mouvement === 'entree') {
        notificationService.notifierMouvementEntrant({
          numero_serie:    infoActif.numero_serie,
          produit_libelle: infoActif.produit_libelle,
        }).catch(err => console.error('❌ Notification mouvement entrant échouée:', err));
      }

      // Alerte de seuil critique : logique centralisée dans stockService (même source
      // que la suppression d'actif). Déclenche l'alerte si le stock est sous le seuil.
      verifierSeuilCritique(infoActif.produit_id, entrepotId)
        .catch(err => console.error('❌ Erreur lors de la vérification du seuil critique:', err));
    }

    res.status(201).json({
      message:   'Mouvement et stock mis à jour avec succès.',
      mouvement: nouveauMouvement,
    });
  } catch (error) {
    console.error('Erreur (createMouvement):', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du mouvement.' });
  }
};

/**
 * @function updateMouvement
 * @description Corrige un mouvement existant (ex: erreur de notes ou de type).
 * À utiliser avec précaution pour ne pas corrompre l'historique d'audit.
 * @param {Object} req - Objet de requête Express (params.id, body).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateMouvement = async (req, res) => {
  try {
    const { id } = req.params;

    const existant = await Mouvement.findById(id);
    if (!existant) {
      return res.status(404).json({ message: 'Mouvement non trouvé.' });
    }

    const mouvementMisAJour = await Mouvement.update(id, req.body);
    res.status(200).json({
      message:   'Mouvement mis à jour avec succès.',
      mouvement: mouvementMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateMouvement):', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du mouvement.' });
  }
};

/**
 * @function deleteMouvement
 * @description Supprime un mouvement (réservé au super_admin pour corriger des erreurs de saisie).
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteMouvement = async (req, res) => {
  try {
    const { id } = req.params;

    const estSupprime = await Mouvement.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Mouvement non trouvé ou déjà supprimé.' });
    }

    res.status(200).json({ message: 'Mouvement supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteMouvement):', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du mouvement.' });
  }
};