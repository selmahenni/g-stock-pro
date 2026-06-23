-- Migration : type de mouvement « transfert » (déplacement d'un actif d'un entrepôt à un autre).
-- On autorise la nouvelle valeur dans la contrainte et on ajoute l'entrepôt de destination
-- (entrepot_id reste l'entrepôt SOURCE pour un transfert).
ALTER TABLE mouvements DROP CONSTRAINT IF EXISTS mouvements_type_mouvement_check;
ALTER TABLE mouvements
  ADD CONSTRAINT mouvements_type_mouvement_check
  CHECK (type_mouvement IN ('entree', 'sortie', 'transfert'));

ALTER TABLE mouvements
  ADD COLUMN IF NOT EXISTS entrepot_destination_id BIGINT REFERENCES entrepots(id);
