-- ============================================================================
--  Migration : cohérence des bons de sortie — 2026-06-23
--  À exécuter sur Supabase (SQL Editor). Idempotent.
--
--  Problème : supprimer un actif supprime en cascade ses mouvements (lignes), mais
--  laissait l'EN-TÊTE du bon de sortie orphelin (affiché « 0 actif »).
--  Décision (cohérence avec la cascade existante) : un bon de sortie sans aucune
--  ligne n'a plus de sens → il est supprimé automatiquement.
-- ============================================================================

BEGIN;

-- 1) Nettoyage ponctuel des en-têtes déjà orphelins (sans aucune ligne)
DELETE FROM bons_sortie b
WHERE NOT EXISTS (SELECT 1 FROM mouvements m WHERE m.bon_sortie_id = b.id);

-- 2) Trigger : à chaque suppression d'un mouvement, si son bon de sortie n'a plus
--    aucune ligne, on supprime l'en-tête. Couvre tous les cas (cascade actif,
--    suppression manuelle d'un mouvement, etc.).
CREATE OR REPLACE FUNCTION supprimer_bon_sortie_vide() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.bon_sortie_id IS NOT NULL THEN
    DELETE FROM bons_sortie b
    WHERE b.id = OLD.bon_sortie_id
      AND NOT EXISTS (SELECT 1 FROM mouvements m WHERE m.bon_sortie_id = b.id);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_supprimer_bon_sortie_vide ON mouvements;
CREATE TRIGGER trg_supprimer_bon_sortie_vide
AFTER DELETE ON mouvements
FOR EACH ROW EXECUTE FUNCTION supprimer_bon_sortie_vide();

COMMIT;
