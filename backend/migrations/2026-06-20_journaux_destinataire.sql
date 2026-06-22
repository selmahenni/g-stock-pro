-- ============================================================================
--  Migration : Journaux de sécurité + destinataire de mouvement — 2026-06-20
--  À exécuter sur Supabase (SQL Editor). Idempotent.
-- ============================================================================

BEGIN;

-- 1) Table des journaux de sécurité (audit) — lecture seule côté super-admin
CREATE TABLE IF NOT EXISTS journaux (
  id             BIGSERIAL PRIMARY KEY,
  utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,   -- connexion | connexion_echec | creation | modification | suppression
  entite         TEXT,            -- produits | actifs | mouvements | utilisateurs | …
  entite_id      BIGINT,
  details        TEXT,
  cree_le        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journaux_cree_le ON journaux (cree_le DESC);

-- 2) Destinataire d'un mouvement (utile surtout pour les sorties)
ALTER TABLE mouvements ADD COLUMN IF NOT EXISTS destinataire TEXT;

COMMIT;
