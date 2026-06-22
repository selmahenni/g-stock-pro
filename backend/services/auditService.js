// services/auditService.js
const Journal = require('../models/Journal');

/**
 * Enregistre une entrée dans le journal de sécurité, de façon NON bloquante :
 * un échec d'audit ne doit jamais faire échouer l'action métier.
 * @param {Object} donnees - { utilisateur_id, action, entite, entite_id, details }
 */
async function enregistrer(donnees) {
  try {
    await Journal.create(donnees);
  } catch (error) {
    console.error('❌ Journalisation (audit) échouée :', error.message);
  }
}

module.exports = { enregistrer };
