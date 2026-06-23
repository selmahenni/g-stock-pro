// services/maintenanceService.js
const pool = require('../config/db');
const Maintenance = require('../models/Maintenance');
const Actif = require('../models/Actif');
const notificationService = require('./notificationService');
const { ajusterStock } = require('./stockService');

/**
 * Change le statut d'un actif et ajuste le STOCK DISPONIBLE (stocks.quantite) UNIQUEMENT
 * lorsqu'il FRANCHIT la frontière « en_stock » :
 *   - en_stock → autre  : stock disponible -1  (ex. panne → maintenance),
 *   - autre → en_stock  : stock disponible +1  (ex. retour d'entretien).
 * Le parc TOTAL (nombre / valeur des actifs) reste inchangé : l'actif ne disparaît jamais
 * de l'inventaire global, il devient simplement indisponible à l'affectation.
 * Idempotent : aucun ajustement si le statut ne change pas réellement.
 * @param {number} actifId
 * @param {string} nouveauStatut
 */
async function definirStatutAvecStock(actifId, nouveauStatut) {
  const { rows } = await pool.query(
    'SELECT produit_id, entrepot_id, statut FROM actifs WHERE id = $1',
    [actifId]
  );
  const a = rows[0];
  if (!a || a.statut === nouveauStatut) return;

  await Actif.setStatut(actifId, nouveauStatut);

  const etaitDispo = a.statut === 'en_stock';
  const devientDispo = nouveauStatut === 'en_stock';
  if (etaitDispo && !devientDispo) {
    await ajusterStock(a.produit_id, a.entrepot_id, -1);
  } else if (!etaitDispo && devientDispo) {
    await ajusterStock(a.produit_id, a.entrepot_id, +1);
  }
}

/**
 * Calcule la date de la prochaine maintenance préventive d'un actif à partir
 * de la règle de son produit (intervalle_valeur + intervalle_unite).
 * @param {Object} produit - { est_maintenable, intervalle_valeur, intervalle_unite }.
 * @param {Date} [from=now] - Point de départ (dernière intervention / création).
 * @returns {Date|null} La prochaine échéance, ou null si pas de maintenance préventive.
 */
function calculerProchaineDate(produit, from = new Date()) {
  const valeur = produit?.intervalle_valeur;
  const unite = produit?.intervalle_unite;
  if (!produit?.est_maintenable || !valeur || !unite) return null;

  const d = new Date(from);
  switch (unite) {
    case 'minute': d.setMinutes(d.getMinutes() + valeur); break;
    case 'heure':  d.setHours(d.getHours() + valeur); break;
    case 'jour':   d.setDate(d.getDate() + valeur); break;
    case 'mois':   d.setMonth(d.getMonth() + valeur); break;
    case 'annee':  d.setFullYear(d.getFullYear() + valeur); break;
    default:       d.setDate(d.getDate() + valeur);
  }
  return d;
}

/** Récupère un actif + les infos produit utiles à la maintenance. */
async function getActifContext(actifId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.numero_serie, a.statut, a.produit_id, a.cree_le,
            p.libelle AS produit_libelle, p.est_maintenable, p.intervalle_valeur, p.intervalle_unite
     FROM actifs a
     LEFT JOIN produits p ON a.produit_id = p.id
     WHERE a.id = $1`,
    [actifId]
  );
  return rows[0] || null;
}

/**
 * Initialise la date de prochaine préventive d'un actif (à sa création) selon la règle produit.
 * @param {number} actifId
 * @param {Date} [from=now]
 */
async function initialiserPreventive(actifId, from = new Date()) {
  const ctx = await getActifContext(actifId);
  const prochaine = calculerProchaineDate(ctx, from);
  if (prochaine) await Actif.setProchainePreventive(actifId, prochaine);
  return prochaine;
}

/**
 * Déclare une panne (maintenance curative) sur un actif :
 * crée un ticket curatif « en_cours », passe l'actif en « maintenance », notifie les techniciens.
 * @param {number} actifId
 * @param {Object} data - { rapport?, technicien_id? }
 * @returns {Promise<Object>} Le ticket créé.
 */
async function declarerPanne(actifId, data = {}) {
  // Garde-fou métier : seuls les actifs de produits MAINTENABLES peuvent tomber en panne.
  const ctxAvant = await getActifContext(actifId);
  if (!ctxAvant) { const e = new Error('Actif introuvable.'); e.status = 404; throw e; }
  if (!ctxAvant.est_maintenable) {
    const e = new Error("Cet actif n'est pas maintenable : aucune panne ne peut être déclarée.");
    e.status = 400; throw e;
  }

  const ticket = await Maintenance.create({
    actif_id: actifId,
    technicien_id: data.technicien_id || null,
    type_maintenance: 'curatif',
    statut: 'en_cours',
    rapport: data.rapport || null,
  });

  // Panne → maintenance : décrémente le stock DISPONIBLE (l'actif reste dans le parc total).
  await definirStatutAvecStock(actifId, 'maintenance');

  const ctx = await getActifContext(actifId);
  notificationService.notifierTechniciens(
    { numero_serie: ctx?.numero_serie, produit_libelle: ctx?.produit_libelle },
    {
      titre: 'Panne déclarée',
      message: `Panne signalée sur l'actif ${ctx?.numero_serie}${ctx?.produit_libelle ? ` (${ctx.produit_libelle})` : ''}.`,
      lien: `/actifs/${actifId}`,
    }
  ).catch(err => console.error('❌ Notif panne échouée:', err));

  return ticket;
}

/**
 * Enregistre un entretien terminé (préventif ou curatif) :
 * crée un ticket « termine », clôt les préventifs ouverts, recalcule la prochaine échéance,
 * et fait sortir l'actif de « maintenance » si nécessaire.
 * @param {number} actifId
 * @param {Object} data - { type_maintenance?, rapport?, date_intervention?, cout?, technicien_id? }
 * @returns {Promise<Object>} Le ticket créé.
 */
async function enregistrerEntretien(actifId, data = {}) {
  // Un entretien finalise l'intervention en cours : on clôt le ticket ouvert s'il existe
  // (panne curative en_cours ou préventif planifié), sinon on crée un ticket terminé.
  const { rows: ouverts } = await pool.query(
    `SELECT * FROM maintenances
     WHERE actif_id = $1 AND statut IN ('en_cours','planifie')
     ORDER BY CASE statut WHEN 'en_cours' THEN 0 ELSE 1 END, cree_le DESC
     LIMIT 1`,
    [actifId]
  );

  let ticket;
  if (ouverts.length > 0) {
    const ouvert = ouverts[0];
    const rapportFinal = ouvert.rapport && data.rapport
      ? `${ouvert.rapport}\n— Entretien : ${data.rapport}`
      : (data.rapport || ouvert.rapport || null);
    ticket = await Maintenance.update(ouvert.id, {
      technicien_id: data.technicien_id || ouvert.technicien_id || null,
      statut: 'termine',
      rapport: rapportFinal,
      date_intervention: data.date_intervention || null,
      cout: data.cout ?? null,
    });
  } else {
    const type = data.type_maintenance === 'curatif' ? 'curatif' : 'preventif';
    ticket = await Maintenance.create({
      actif_id: actifId,
      technicien_id: data.technicien_id || null,
      type_maintenance: type,
      statut: 'termine',
      date_intervention: data.date_intervention || null,
      rapport: data.rapport || null,
      cout: data.cout ?? null,
    });
  }

  // Sécurité : clôt tout autre ticket encore ouvert pour cet actif (pas d'échéance fantôme)
  await pool.query(
    `UPDATE maintenances SET statut = 'termine'
     WHERE actif_id = $1 AND statut IN ('planifie','en_cours') AND id <> $2`,
    [actifId, ticket.id]
  );

  // Échéance préventive : SEULE une intervention PRÉVENTIVE la repousse (depuis maintenant).
  // Une réparation CURATIVE (suite à une panne) ne décale PAS le calendrier préventif —
  // l'intervalle de maintenance préventive reste le même.
  const ctx = await getActifContext(actifId);
  if (ticket.type_maintenance === 'preventif') {
    await Actif.setProchainePreventive(actifId, calculerProchaineDate(ctx, new Date()));
  }

  // Retour d'entretien : si l'actif était en maintenance, il revient « en_stock »
  // et le stock DISPONIBLE est ré-incrémenté.
  if (ctx?.statut === 'maintenance') await definirStatutAvecStock(actifId, 'en_stock');

  return ticket;
}

/**
 * Vérifie les échéances préventives atteintes : pour chaque actif dû et sans ticket
 * préventif ouvert, crée un ticket « planifie » et notifie les techniciens.
 * Appelé périodiquement par le planificateur.
 * @returns {Promise<number>} Nombre d'échéances traitées.
 */
async function verifierEcheancesPreventives() {
  const { rows } = await pool.query(
    `SELECT a.id, a.numero_serie, a.date_prochaine_preventive, p.libelle AS produit_libelle
     FROM actifs a
     JOIN produits p ON a.produit_id = p.id
     WHERE a.date_prochaine_preventive IS NOT NULL
       AND a.date_prochaine_preventive <= NOW()
       AND p.est_maintenable = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM maintenances m
         WHERE m.actif_id = a.id AND m.type_maintenance = 'preventif' AND m.statut IN ('planifie','en_cours')
       )`
  );

  for (const a of rows) {
    await Maintenance.create({
      actif_id: a.id,
      type_maintenance: 'preventif',
      statut: 'planifie',
      date_intervention: a.date_prochaine_preventive,
    });
    await notificationService.notifierTechniciens(
      { numero_serie: a.numero_serie, produit_libelle: a.produit_libelle },
      {
        titre: 'Maintenance préventive à planifier',
        message: `Échéance préventive atteinte pour l'actif ${a.numero_serie}${a.produit_libelle ? ` (${a.produit_libelle})` : ''}.`,
        lien: `/actifs/${a.id}`,
      }
    );
  }
  return rows.length;
}

/**
 * Synchronise l'état d'un actif à partir de SES TICKETS (idempotent), à appeler après
 * TOUT changement de statut d'un ticket (édition incluse). Déduit l'état cohérent :
 *  - Statut de l'actif : « maintenance » s'il existe un ticket EN COURS, sinon sortie de
 *    maintenance (retour « en_stock »). Les statuts « affecte »/« rebut » (décisions
 *    manuelles) ne sont jamais écrasés.
 *  - Prochaine échéance préventive : recalculée depuis la DERNIÈRE intervention TERMINÉE
 *    (ou la date de création de l'actif si aucune). Ainsi, rouvrir un ticket terminé
 *    « annule » correctement l'avance de l'échéance, et clôturer la repousse.
 * @param {number} actifId
 */
async function synchroniserActif(actifId) {
  const ctx = await getActifContext(actifId);
  if (!ctx) return;

  // 1. Statut de l'actif déduit des tickets : « maintenance » ssi un ticket est EN COURS.
  const { rows: enCours } = await pool.query(
    `SELECT 1 FROM maintenances WHERE actif_id = $1 AND statut = 'en_cours' LIMIT 1`,
    [actifId]
  );
  const aEnCours = enCours.length > 0;
  if (aEnCours && ctx.statut !== 'maintenance') {
    await definirStatutAvecStock(actifId, 'maintenance'); // stock disponible -1
  } else if (!aEnCours && ctx.statut === 'maintenance') {
    await definirStatutAvecStock(actifId, 'en_stock');    // stock disponible +1
  }

  // 2. Prochaine échéance préventive depuis la dernière intervention PRÉVENTIVE terminée
  //    (ou la création). Les réparations curatives n'entrent pas dans ce calcul.
  const { rows } = await pool.query(
    `SELECT MAX(COALESCE(date_intervention, cree_le::date)) AS derniere
     FROM maintenances WHERE actif_id = $1 AND statut = 'termine' AND type_maintenance = 'preventif'`,
    [actifId]
  );
  const base = rows[0]?.derniere ? new Date(rows[0].derniere) : new Date(ctx.cree_le || Date.now());
  await Actif.setProchainePreventive(actifId, calculerProchaineDate(ctx, base));
}

/**
 * Resynchronise un actif après la CLÔTURE d'un ticket (passage à « termine »).
 * Clôt d'abord les tickets préventifs PLANIFIÉS résiduels (l'échéance qui les a déclenchés
 * vient d'être traitée), puis applique la synchronisation générale de l'actif.
 * Corrige le cas où l'échéancier reste « en retard » après clôture.
 * @param {number} actifId
 */
async function synchroniserApresCloture(actifId) {
  // Clôt les tickets préventifs PLANIFIÉS résiduels (obsolètes après une intervention).
  await pool.query(
    `UPDATE maintenances SET statut = 'termine'
     WHERE actif_id = $1 AND type_maintenance = 'preventif' AND statut = 'planifie'`,
    [actifId]
  );
  await synchroniserActif(actifId);
}

module.exports = {
  calculerProchaineDate,
  getActifContext,
  initialiserPreventive,
  declarerPanne,
  enregistrerEntretien,
  verifierEcheancesPreventives,
  synchroniserActif,
  synchroniserApresCloture,
};
