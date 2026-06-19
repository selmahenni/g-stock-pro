-- ============================================================================
--  Migration : Intervalle de maintenance préventive avec unité — 2026-06-19
--  À exécuter sur Supabase (SQL Editor). Idempotent.
--
--  Permet d'exprimer l'intervalle de maintenance préventive en valeur + unité
--  (minute / heure / jour / mois / annee) au lieu d'un nombre de jours figé.
--  `est_maintenable` reste l'interrupteur ; le type est dérivé côté applicatif :
--    - non maintenable           -> est_maintenable = false
--    - curative (à la demande)   -> est_maintenable = true,  sans intervalle
--    - préventive (planifiée)    -> est_maintenable = true,  avec intervalle
--  La colonne héritée `intervalle_maintenance_jours` est conservée (compat).
-- ============================================================================

BEGIN;

ALTER TABLE produits ADD COLUMN IF NOT EXISTS intervalle_valeur INTEGER;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS intervalle_unite  TEXT;

-- Reprise des données existantes : ancien "X jours" -> valeur = X, unité = 'jour'
UPDATE produits
   SET intervalle_valeur = intervalle_maintenance_jours,
       intervalle_unite  = 'jour'
 WHERE intervalle_maintenance_jours IS NOT NULL
   AND intervalle_valeur IS NULL;

COMMIT;
