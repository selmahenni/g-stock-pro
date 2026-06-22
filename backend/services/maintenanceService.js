// services/maintenanceService.js
const pool = require('../config/db');
const Maintenance = require('../models/Maintenance');
const Actif = require('../models/Actif');
const notificationService = require('./notificationService');

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
    `SELECT a.id, a.numero_serie, a.statut, a.produit_id,
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
  const ticket = await Maintenance.create({
    actif_id: actifId,
    technicien_id: data.technicien_id || null,
    type_maintenance: 'curatif',
    statut: 'en_cours',
    rapport: data.rapport || null,
  });

  await Actif.setStatut(actifId, 'maintenance');

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

  // Recalcule la prochaine échéance préventive depuis maintenant
  const ctx = await getActifContext(actifId);
  const prochaine = calculerProchaineDate(ctx, new Date());
  await Actif.setProchainePreventive(actifId, prochaine);

  // L'actif sort de maintenance s'il y était
  if (ctx?.statut === 'maintenance') await Actif.setStatut(actifId, 'en_stock');

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
 * Resynchronise un actif après la clôture d'un ticket (ex : ticket passé à « termine »
 * via l'édition). Recalcule la prochaine échéance préventive à partir de la DERNIÈRE
 * intervention terminée, et fait sortir l'actif de « maintenance » s'il n'a plus de
 * ticket ouvert. Corrige le cas où l'échéancier reste « en retard » après clôture.
 * @param {number} actifId
 */
async function synchroniserApresCloture(actifId) {
  const ctx = await getActifContext(actifId);
  if (!ctx) return;

  // 1. Clôt les tickets préventifs PLANIFIÉS résiduels : l'échéance qui les a déclenchés
  //    vient d'être traitée, ils sont donc obsolètes (sinon ils bloquent l'actif).
  await pool.query(
    `UPDATE maintenances SET statut = 'termine'
     WHERE actif_id = $1 AND type_maintenance = 'preventif' AND statut = 'planifie'`,
    [actifId]
  );

  // 2. Recalcule la prochaine échéance depuis la DERNIÈRE intervention terminée
  const { rows } = await pool.query(
    `SELECT MAX(COALESCE(date_intervention, cree_le::date)) AS derniere
     FROM maintenances WHERE actif_id = $1 AND statut = 'termine'`,
    [actifId]
  );
  const base = rows[0]?.derniere ? new Date(rows[0].derniere) : new Date();
  await Actif.setProchainePreventive(actifId, calculerProchaineDate(ctx, base));

  // 3. L'actif sort de « maintenance » s'il ne reste aucune intervention EN COURS
  if (ctx.statut === 'maintenance') {
    const { rows: enCours } = await pool.query(
      `SELECT 1 FROM maintenances WHERE actif_id = $1 AND statut = 'en_cours' LIMIT 1`,
      [actifId]
    );
    if (enCours.length === 0) await Actif.setStatut(actifId, 'en_stock');
  }
}

module.exports = {
  calculerProchaineDate,
  initialiserPreventive,
  declarerPanne,
  enregistrerEntretien,
  verifierEcheancesPreventives,
  synchroniserApresCloture,
};
