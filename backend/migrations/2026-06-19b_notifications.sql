-- ============================================================================
--  Migration : Table notifications — colonnes d'état — 2026-06-19
--  À exécuter sur Supabase (SQL Editor).
--
--  La table `notifications` existe déjà (services/notificationService.js y écrit :
--  utilisateur_id, titre, type_notif, message, lien). On garantit ici la présence
--  des colonnes d'état lues par la nouvelle API de notifications (front).
--  Idempotent.
-- ============================================================================

BEGIN;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS est_lu  BOOLEAN   DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Index pour récupérer rapidement les notifications d'un utilisateur (récentes d'abord)
CREATE INDEX IF NOT EXISTS idx_notifications_utilisateur
  ON notifications (utilisateur_id, cree_le DESC);

COMMIT;
