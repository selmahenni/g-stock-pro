-- ============================================================================
--  Migration : Bons de sortie (groupage de mouvements de sortie) — 2026-06-23
--  À exécuter sur Supabase (SQL Editor). Idempotent.
--
--  Un BON DE SORTIE est un document d'en-tête qui regroupe PLUSIEURS sorties
--  d'actifs (ses « lignes »). Chaque ligne reste un mouvement de type 'sortie'
--  normal (table mouvements), simplement rattaché au bon via bon_sortie_id.
--  → Les sorties unitaires existantes ne sont pas impactées (bon_sortie_id NULL).
-- ============================================================================

BEGIN;

-- 1) En-tête du bon de sortie
CREATE TABLE IF NOT EXISTS bons_sortie (
  id            BIGSERIAL PRIMARY KEY,
  reference     TEXT,                                            -- ex : BS-00042
  destinataire  TEXT,                                            -- bénéficiaire commun à toutes les lignes
  notes         TEXT,
  effectue_par  BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Rattachement d'une ligne (mouvement de sortie) à son bon — NULL = sortie unitaire (existant)
ALTER TABLE mouvements
  ADD COLUMN IF NOT EXISTS bon_sortie_id BIGINT REFERENCES bons_sortie(id) ON DELETE SET NULL;

-- 3) Index : lister rapidement les lignes d'un bon, et l'historique des bons
CREATE INDEX IF NOT EXISTS idx_mouvements_bon_sortie ON mouvements (bon_sortie_id);
CREATE INDEX IF NOT EXISTS idx_bons_sortie_cree_le   ON bons_sortie (cree_le DESC);

COMMIT;
