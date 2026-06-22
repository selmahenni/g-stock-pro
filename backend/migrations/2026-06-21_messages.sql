-- Migration : module de messagerie interne / externe.
-- Un message a SOIT un destinataire interne (destinataire_id),
-- SOIT un destinataire externe (destinataire_email + est_externe = TRUE).
-- Dans les deux cas la ligne sert aussi d'archive « Envoyés » pour l'expéditeur.
CREATE TABLE IF NOT EXISTS messages (
  id                 BIGSERIAL PRIMARY KEY,
  expediteur_id      BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  destinataire_id    BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
  destinataire_email TEXT,
  est_externe        BOOLEAN NOT NULL DEFAULT FALSE,
  sujet              TEXT    NOT NULL,
  corps              TEXT    NOT NULL,
  est_lu             BOOLEAN NOT NULL DEFAULT FALSE,
  cree_le            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages (destinataire_id, cree_le DESC);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur   ON messages (expediteur_id, cree_le DESC);
