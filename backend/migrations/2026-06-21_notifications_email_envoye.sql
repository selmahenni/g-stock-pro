-- Migration : indicateur « envoyé par e-mail » sur les notifications in-app.
-- Permet d'afficher dans la boîte de notifications quelles alertes ont aussi
-- été envoyées par e-mail (utile notamment au super_admin pour les alertes stock).
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_envoye BOOLEAN NOT NULL DEFAULT FALSE;
