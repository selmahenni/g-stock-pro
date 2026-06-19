-- ============================================================================
--  Migration : Module Maintenance V2 — 2026-06-19
--  À exécuter sur Supabase (SQL Editor). Idempotent.
--
--  Sépare la RÈGLE (produit : est_maintenable + intervalle_valeur/unite, déjà en
--  place) de l'EXÉCUTION (tickets de maintenance sur l'actif unitaire).
-- ============================================================================

BEGIN;

-- 1) ACTIFS : date de la prochaine maintenance préventive (calculée par le backend)
--    TIMESTAMPTZ impératif : sinon décalage de fuseau entre Node (local) et NOW() côté DB.
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS date_prochaine_preventive TIMESTAMPTZ;

-- 2) MAINTENANCES : passage en "tickets" (préventif / curatif + cycle de vie)
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS type_maintenance TEXT;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS statut           TEXT DEFAULT 'planifie';
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS cout             NUMERIC(12,2);

-- Backfill des éventuelles lignes existantes (avant ajout des contraintes)
UPDATE maintenances SET type_maintenance = 'curatif' WHERE type_maintenance IS NULL;
UPDATE maintenances SET statut = 'termine'           WHERE statut IS NULL;

-- Contraintes de domaine (idempotentes : on retire puis on (re)crée)
ALTER TABLE maintenances DROP CONSTRAINT IF EXISTS maintenances_type_check;
ALTER TABLE maintenances ADD  CONSTRAINT maintenances_type_check
  CHECK (type_maintenance IN ('preventif', 'curatif'));

ALTER TABLE maintenances DROP CONSTRAINT IF EXISTS maintenances_statut_check;
ALTER TABLE maintenances ADD  CONSTRAINT maintenances_statut_check
  CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule'));

-- Index pour l'historique par actif et la détection des tickets ouverts
CREATE INDEX IF NOT EXISTS idx_maintenances_actif ON maintenances (actif_id, cree_le DESC);

COMMIT;
