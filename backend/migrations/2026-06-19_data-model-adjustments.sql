-- ============================================================================
--  Migration : Ajustement du modèle de données — 2026-06-19
--  À exécuter sur la base Supabase (SQL Editor) AVANT de déployer le backend.
--
--  Contenu :
--   1. Déplacement de prix_unitaire  : produits  ->  actifs
--   2. Ajout de produits.image_url   : stockage d'image (upload Supabase)
--   3. Colonnes de traçabilité       : cree_par / modifie_par (produits, actifs)
--   4. (Optionnel) Trigger SQL de mise à jour automatique des stocks
--
--  La migration est idempotente (IF [NOT] EXISTS) et sans perte de données :
--  le prix existant des produits est recopié sur leurs actifs avant suppression.
-- ============================================================================

BEGIN;

-- 1) ACTIFS : prix unitaire (coût d'acquisition propre à chaque unité physique)
ALTER TABLE actifs ADD COLUMN IF NOT EXISTS prix_unitaire NUMERIC(12,2);

--    Reprise de l'ancien prix produit pour les actifs déjà enregistrés
UPDATE actifs a
   SET prix_unitaire = p.prix_unitaire
  FROM produits p
 WHERE a.produit_id = p.id
   AND a.prix_unitaire IS NULL
   AND p.prix_unitaire IS NOT NULL;

-- 2) PRODUITS : URL d'image (préparation upload via Supabase Storage)
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3) TRAÇABILITÉ : auteur de création / dernière modification
ALTER TABLE produits ADD COLUMN IF NOT EXISTS cree_par     INTEGER REFERENCES utilisateurs(id);
ALTER TABLE produits ADD COLUMN IF NOT EXISTS modifie_par  INTEGER REFERENCES utilisateurs(id);
ALTER TABLE actifs   ADD COLUMN IF NOT EXISTS cree_par     INTEGER REFERENCES utilisateurs(id);
ALTER TABLE actifs   ADD COLUMN IF NOT EXISTS modifie_par  INTEGER REFERENCES utilisateurs(id);
--    (mouvements.effectue_par existe déjà et joue ce rôle pour les mouvements)

-- 4) Suppression définitive du prix côté produits (après recopie en étape 1)
ALTER TABLE produits DROP COLUMN IF EXISTS prix_unitaire;

COMMIT;


-- ============================================================================
--  OPTION : déléguer la mise à jour des stocks à un TRIGGER PostgreSQL
--  ----------------------------------------------------------------------------
--  Le backend gère déjà l'incrément/décrément des stocks (services/stockService.js).
--  Si vous préférez que la base le garantisse elle-même (même hors API), exécutez
--  le bloc ci-dessous. ⚠️ Ne PAS activer en plus de la logique backend, sous peine
--  de double comptage : choisissez l'une OU l'autre approche.
-- ============================================================================
--
-- CREATE OR REPLACE FUNCTION fn_stock_sur_actif() RETURNS TRIGGER AS $$
-- BEGIN
--   IF (TG_OP = 'INSERT') THEN
--     INSERT INTO stocks (produit_id, entrepot_id, quantite)
--     VALUES (NEW.produit_id, NEW.entrepot_id, 1)
--     ON CONFLICT (produit_id, entrepot_id)
--     DO UPDATE SET quantite = stocks.quantite + 1, mis_a_jour_le = CURRENT_TIMESTAMP;
--   ELSIF (TG_OP = 'DELETE') THEN
--     UPDATE stocks
--        SET quantite = GREATEST(quantite - 1, 0), mis_a_jour_le = CURRENT_TIMESTAMP
--      WHERE produit_id = OLD.produit_id AND entrepot_id = OLD.entrepot_id;
--   END IF;
--   RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS trg_stock_sur_actif ON actifs;
-- CREATE TRIGGER trg_stock_sur_actif
--   AFTER INSERT OR DELETE ON actifs
--   FOR EACH ROW EXECUTE FUNCTION fn_stock_sur_actif();
--
--  NB : la clause ON CONFLICT ci-dessus suppose un index unique :
--  CREATE UNIQUE INDEX IF NOT EXISTS uniq_stock_produit_entrepot
--    ON stocks (produit_id, entrepot_id);
-- ============================================================================
