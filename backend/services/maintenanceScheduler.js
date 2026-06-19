// services/maintenanceScheduler.js
const maintenanceService = require('./maintenanceService');

/**
 * Planificateur in-process léger : vérifie périodiquement les échéances de
 * maintenance préventive et génère les tickets + notifications correspondants.
 * Désactivable via MAINTENANCE_SCHEDULER=off. Période réglable via
 * MAINTENANCE_SCHEDULER_MS (défaut 60 000 ms).
 */
function demarrerPlanificateurMaintenance() {
  if (process.env.MAINTENANCE_SCHEDULER === 'off') {
    console.log('⏸️  Planificateur de maintenance désactivé (MAINTENANCE_SCHEDULER=off).');
    return null;
  }

  const periode = parseInt(process.env.MAINTENANCE_SCHEDULER_MS, 10) || 60000;

  const tick = async () => {
    try {
      const n = await maintenanceService.verifierEcheancesPreventives();
      if (n > 0) console.log(`🔧 Planificateur : ${n} échéance(s) préventive(s) traitée(s).`);
    } catch (err) {
      console.error('❌ Erreur du planificateur de maintenance :', err.message);
    }
  };

  // Premier passage peu après le démarrage, puis à intervalle régulier
  setTimeout(tick, 5000);
  const timer = setInterval(tick, periode);
  timer.unref?.(); // ne bloque pas l'arrêt du process
  console.log(`🗓️  Planificateur de maintenance actif (toutes les ${periode / 1000}s).`);
  return timer;
}

module.exports = { demarrerPlanificateurMaintenance };
