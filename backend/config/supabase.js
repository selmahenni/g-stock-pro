// config/supabase.js
// Client Supabase utilisé pour le STORAGE des images (bucket public).
const { createClient } = require('@supabase/supabase-js');

/**
 * URL du projet Supabase :
 *  - prend SUPABASE_URL si défini ;
 *  - sinon la dérive de DB_USER au format « postgres.<ref> » → https://<ref>.supabase.co.
 */
function deriverUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/+$/, '');
  const m = (process.env.DB_USER || '').match(/^postgres\.([a-z0-9]+)$/i);
  return m ? `https://${m[1]}.supabase.co` : null;
}

const SUPABASE_URL = deriverUrl();
// Clé d'accès au Storage : service_role (recommandée côté serveur) ou clé fournie.
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || null;
const BUCKET = process.env.SUPABASE_BUCKET || 'images';

let supabase = null;
if (SUPABASE_URL && SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  console.log(`🗄️  Supabase Storage configuré (bucket « ${BUCKET} »).`);
} else {
  console.warn('⚠️  Supabase Storage NON configuré (SUPABASE_SERVICE_ROLE_KEY manquant) → repli sur le stockage local /uploads.');
}

module.exports = {
  supabase,
  bucket: BUCKET,
  estConfigure: Boolean(supabase),
  url: SUPABASE_URL,
};
