// controllers/actifController.js
const Actif = require('../models/Actif');
const pool = require('../config/db');
const { ajusterStock, verifierSeuilCritique } = require('../services/stockService');
const maintenanceService = require('../services/maintenanceService');

/**
 * Vérifie qu'un entrepôt existe et est ACTIF avant d'y stocker des actifs.
 * @param {number|string} entrepotId
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
async function entrepotActif(entrepotId) {
  const { rows } = await pool.query('SELECT est_actif FROM entrepots WHERE id = $1', [entrepotId]);
  if (rows.length === 0) return { ok: false, message: 'Entrepôt introuvable.' };
  if (rows[0].est_actif === false) return { ok: false, message: 'Cet entrepôt est inactif : impossible d\'y stocker des actifs.' };
  return { ok: true };
}

/**
 * @function getAllActifs
 * @description Récupère tout l'inventaire physique avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllActifs = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const produitId = req.query.produit_id ? parseInt(req.query.produit_id) : null;
    const statut = req.query.statut || null; // 'en_stock' | 'affecte' | 'maintenance' | 'rebut'

    const { rows, total } = await Actif.findPaginated({ page, limit, search, produitId, statut });
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
      actifs: rows,
    });
  } catch (error) {
    console.error('Erreur (getAllActifs):', error);
    res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * @function getActifById
 * @description Récupère un actif par son identifiant, avec les jointures produit et entrepôt.
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getActifById = async (req, res) => {
  try {
    const { id } = req.params;
    const actif = await Actif.findById(id);

    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé.' });
    }

    res.status(200).json(actif);
  } catch (error) {
    console.error('Erreur (getActifById):', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * @function createActif
 * @description Enregistre un nouveau matériel dans le parc.
 * @param {Object} req - Objet de requête Express (body: { produit_id, numero_serie, entrepot_id, ... }).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getActifBySerie = async (req, res) => {
  try {
    const actif = await Actif.findBySerie(req.params.numero);
    if (!actif) {
      return res.status(404).json({ message: 'Aucun actif trouvé pour ce numéro de série.' });
    }
    res.status(200).json(actif);
  } catch (error) {
    console.error('Erreur (getActifBySerie):', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.createActif = async (req, res) => {
  try {
    const { produit_id, numero_serie, entrepot_id } = req.body;

    if (!produit_id || !numero_serie || !entrepot_id) {
      return res.status(400).json({
        message: 'produit_id, numero_serie et entrepot_id sont obligatoires.',
      });
    }

    // L'entrepôt doit être actif pour pouvoir y stocker un actif.
    const verifEntrepot = await entrepotActif(entrepot_id);
    if (!verifEntrepot.ok) return res.status(400).json({ message: verifEntrepot.message });

    // Traçabilité : auteur depuis le token. Tout nouvel actif entre EN STOCK
    // (le statut évolue ensuite via les mouvements / la maintenance) → cohérence du stock.
    const nouvelActif = await Actif.create({ ...req.body, statut: 'en_stock', cree_par: req.utilisateur?.id ?? null });

    // Toute création d'actif = une entrée physique : on incrémente le stock du produit
    // (non bloquant : une erreur de stock ne doit pas annuler l'enregistrement de l'actif)
    ajusterStock(nouvelActif.produit_id, nouvelActif.entrepot_id, +1)
      .catch(err => console.error('❌ Erreur ajustement stock (création actif):', err));

    // Initialise l'échéance de maintenance préventive selon la règle du produit (non bloquant)
    maintenanceService.initialiserPreventive(nouvelActif.id, new Date(nouvelActif.cree_le || Date.now()))
      .catch(err => console.error('❌ Init préventive (création actif):', err));

    res.status(201).json({
      message: 'Actif enregistré avec succès.',
      actif:   nouvelActif,
    });
  } catch (error) {
    console.error('Erreur (createActif):', error);
    // Numéro de série déjà existant (contrainte UNIQUE PostgreSQL)
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce numéro de série existe déjà dans le système.' });
    }
    res.status(500).json({ message: 'Erreur lors de la création de l\'actif.' });
  }
};

/**
 * @function updateActif
 * @description Met à jour un actif existant (statut, emplacement, affectation...).
 * Accessible au super_admin, magasinier et technicien (conformément à la matrice RBAC).
 * @param {Object} req - Objet de requête Express (params.id, body).
 * @param {Object} res - Objet de réponse Express.
 */
exports.updateActif = async (req, res) => {
  try {
    const { id } = req.params;

    const existant = await Actif.findById(id);
    if (!existant) {
      return res.status(404).json({ message: 'Actif non trouvé.' });
    }

    // Fusion sécurisée : on ne remplace que les champs envoyés
    const dataToUpdate = {
      produit_id:             req.body.produit_id              ?? existant.produit_id,
      numero_serie:           req.body.numero_serie            ?? existant.numero_serie,
      entrepot_id:            req.body.entrepot_id             ?? existant.entrepot_id,
      emplacement:            req.body.emplacement             ?? existant.emplacement,
      utilisateur_affecte_id: req.body.utilisateur_affecte_id ?? existant.utilisateur_affecte_id,
      statut:                 req.body.statut                  ?? existant.statut,
      prix_unitaire:          req.body.prix_unitaire           ?? existant.prix_unitaire,
      // Traçabilité : auteur de la dernière modification
      modifie_par:            req.utilisateur?.id ?? null,
    };

    const actifMisAJour = await Actif.update(id, dataToUpdate);

    // STOCK DISPONIBLE : si l'édition fait FRANCHIR la frontière « en_stock » (changement
    // de statut) ou DÉPLACE un actif en stock (changement de produit/entrepôt), on ajuste
    // le disponible — exactement comme les mouvements et la maintenance. Le parc TOTAL,
    // lui, ne bouge pas (l'actif existe toujours).
    const etaitDispo   = existant.statut === 'en_stock';
    const devientDispo = dataToUpdate.statut === 'en_stock';
    const memeEmplacement =
      Number(existant.produit_id)  === Number(dataToUpdate.produit_id) &&
      Number(existant.entrepot_id) === Number(dataToUpdate.entrepot_id);
    try {
      if (etaitDispo && (!devientDispo || !memeEmplacement)) {
        await ajusterStock(existant.produit_id, existant.entrepot_id, -1);
        verifierSeuilCritique(existant.produit_id, existant.entrepot_id).catch(() => {});
      }
      if (devientDispo && (!etaitDispo || !memeEmplacement)) {
        await ajusterStock(dataToUpdate.produit_id, dataToUpdate.entrepot_id, +1);
      }
    } catch (e) {
      console.error('❌ Ajustement stock disponible (édition actif):', e.message);
    }

    res.status(200).json({
      message: 'Actif mis à jour avec succès.',
      actif:   actifMisAJour,
    });
  } catch (error) {
    console.error('Erreur (updateActif):', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce numéro de série existe déjà dans le système.' });
    }
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'actif.' });
  }
};

/**
 * @function deleteActif
 * @description Supprime un actif du parc matériel (réservé au super_admin).
 * @param {Object} req - Objet de requête Express (params.id).
 * @param {Object} res - Objet de réponse Express.
 */
exports.deleteActif = async (req, res) => {
  try {
    const { id } = req.params;

    // On récupère l'actif avant suppression pour pouvoir ajuster le stock
    const existant = await Actif.findById(id);

    const estSupprime = await Actif.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: 'Actif non trouvé ou déjà supprimé.' });
    }

    // Suppression d'un actif = sortie physique : on décrémente le stock du produit (non bloquant),
    // puis on vérifie le seuil critique (alerte notif/e-mail si le stock est tombé sous le seuil).
    if (existant) {
      ajusterStock(existant.produit_id, existant.entrepot_id, -1)
        .then(() => verifierSeuilCritique(existant.produit_id, existant.entrepot_id))
        .catch(err => console.error('❌ Ajustement stock / alerte seuil (suppression actif):', err));
    }

    res.status(200).json({ message: 'Actif supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur (deleteActif):', error);
    // Contrainte FK : actif lié à des mouvements ou maintenances
    if (error.code === '23503') {
      return res.status(409).json({
        message: 'Impossible de supprimer : des mouvements ou maintenances sont liés à cet actif.',
      });
    }
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'actif.' });
  }
};

/**
 * @function createActifsBatch
 * @description Crée plusieurs actifs en lot (batch) dans une transaction PostgreSQL.
 * Le stock est incrémenté une seule fois du delta total (+N).
 * @param {Object} req - body: { produit_id, entrepot_id, numeros_serie: string[], emplacement?, prix_unitaire?, statut? }
 * @param {Object} res - Objet de réponse Express.
 */
exports.createActifsBatch = async (req, res) => {
  const { produit_id, entrepot_id, numeros_serie, emplacement, prix_unitaire } = req.body;

  if (!produit_id || !entrepot_id) {
    return res.status(400).json({ message: 'produit_id et entrepot_id sont obligatoires.' });
  }
  if (!Array.isArray(numeros_serie)) {
    return res.status(400).json({ message: 'numeros_serie doit être un tableau.' });
  }

  // L'entrepôt doit être actif pour pouvoir y stocker des actifs.
  const verifEntrepot = await entrepotActif(entrepot_id);
  if (!verifEntrepot.ok) return res.status(400).json({ message: verifEntrepot.message });

  // Nettoyage : trim + suppression des entrées vides
  const serials = numeros_serie.map((s) => String(s).trim()).filter(Boolean);
  if (serials.length === 0) {
    return res.status(400).json({ message: 'Saisissez au moins un numéro de série.' });
  }
  // Doublons internes au lot
  if (new Set(serials).size !== serials.length) {
    return res.status(400).json({ message: 'Le lot contient des numéros de série en double.' });
  }

  const creePar = req.utilisateur?.id ?? null;
  const prixUnit = (prix_unitaire !== undefined && prix_unitaire !== null && prix_unitaire !== '')
    ? Number(prix_unitaire) : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insertion atomique de tous les actifs du lot
    const actifsCreés = [];
    for (const ns of serials) {
      const { rows } = await client.query(
        `INSERT INTO actifs (produit_id, numero_serie, entrepot_id, emplacement, utilisateur_affecte_id, statut, prix_unitaire, cree_par)
         VALUES ($1, $2, $3, $4, $5, 'en_stock', $6, $7)
         RETURNING *`,
        [produit_id, ns, entrepot_id, emplacement || null, null, prixUnit, creePar]
      );
      actifsCreés.push(rows[0]);
    }
    const nombre = actifsCreés.length;

    // 2. INTÉGRITÉ : incrément du stock (+N) du produit dans le bon entrepôt,
    //    DANS la même transaction (mécanisme existant, atomique avec les inserts).
    await ajusterStock(produit_id, entrepot_id, nombre, client);

    // 3. Maintenance préventive : calcul unique + un seul UPDATE pour tout le lot
    const { rows: prod } = await client.query(
      'SELECT est_maintenable, intervalle_valeur, intervalle_unite FROM produits WHERE id = $1',
      [produit_id]
    );
    const prochaine = maintenanceService.calculerProchaineDate(prod[0], new Date());
    if (prochaine) {
      await client.query(
        'UPDATE actifs SET date_prochaine_preventive = $1 WHERE id = ANY($2::bigint[])',
        [prochaine, actifsCreés.map((a) => a.id)]
      );
    }

    await client.query('COMMIT');

    // 4. Valeur totale du lot = prix unitaire × nombre d'actifs
    const valeurTotale = (prixUnit || 0) * nombre;

    res.status(201).json({
      message: `${nombre} actif(s) enregistré(s) avec succès.`,
      nombre,
      prix_unitaire: prixUnit,
      valeur_totale: valeurTotale,
      actifs: actifsCreés,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur (createActifsBatch):', error);
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Un numéro de série du lot existe déjà dans le système. Aucun actif n\'a été créé (lot annulé).' });
    }
    res.status(500).json({ message: 'Erreur lors de la création du lot d\'actifs.' });
  } finally {
    client.release();
  }
};