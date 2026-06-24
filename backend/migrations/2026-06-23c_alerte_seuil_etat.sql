-- ============================================================================
--  Migration : anti-spam des alertes de seuil critique — 2026-06-23
--  À exécuter sur Supabase (SQL Editor). Idempotent.
--
--  Objectif : n'envoyer l'alerte de seuil qu'UNE fois, au moment où le stock
--  FRANCHIT le seuil critique — et non à chaque opération tant qu'il reste bas.
--  Le drapeau est remis à FALSE dès que le stock repasse au-dessus du seuil
--  (ré-armement pour la prochaine fois).
-- ============================================================================

BEGIN;

ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS alerte_seuil_envoyee BOOLEAN NOT NULL DEFAULT FALSE;

-- Initialisation cohérente de l'état pour les lignes existantes :
-- déjà sous le seuil → considéré comme « déjà alerté » (on n'envoie pas de rappel
-- rétroactif) ; au-dessus du seuil → armé pour la prochaine baisse.
UPDATE stocks s
SET alerte_seuil_envoyee = (
  SELECT p.stock_critique IS NOT NULL
     AND p.stock_critique > 0
     AND s.quantite <= p.stock_critique
  FROM produits p WHERE p.id = s.produit_id
);

COMMIT;
