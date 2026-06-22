// middlewares/auditMiddleware.js
const auditService = require('../services/auditService');

// Méthode HTTP -> type d'action métier + verbe lisible
const ACTIONS = { POST: 'creation', PUT: 'modification', PATCH: 'modification', DELETE: 'suppression' };
const VERBES = { creation: 'Création', modification: 'Modification', suppression: 'Suppression' };

// Entité (segment d'URL) -> libellé singulier lisible
const ENTITES = {
  produits: 'produit', actifs: 'actif', mouvements: 'mouvement', utilisateurs: 'utilisateur',
  categories: 'catégorie', fournisseurs: 'fournisseur', entrepots: 'entrepôt',
  maintenances: 'maintenance', stocks: 'stock', uploads: 'fichier', journaux: 'journal',
  messages: 'message',
};

// Sous-actions spécifiques (3e/4e segment) -> description lisible
const SOUS_ACTIONS = {
  statut: 'Changement de statut',
  panne: 'Déclaration de panne',
  entretien: 'Enregistrement d\'un entretien',
  lu: 'Notification marquée lue',
  'tout-lu': 'Notifications marquées lues',
  image: 'Téléversement d\'image',
};

// Routes gérées explicitement ailleurs (auth) -> ne pas journaliser ici
const IGNORE = [
  '/api/utilisateurs/connexion',
  '/api/utilisateurs/deconnexion',
  '/api/utilisateurs/inscription',
];

/**
 * @middleware journaliser
 * @description Journalise automatiquement toute MUTATION réussie (POST/PUT/PATCH/DELETE)
 * dans le journal de sécurité, avec un libellé lisible. On capture l'URL à l'exécution
 * (req.originalUrl, jamais réécrite par les sous-routeurs) puis on lit req.utilisateur à
 * la fin de la requête (posé entre-temps par verifyToken).
 */
function journaliser(req, res, next) {
  const action = ACTIONS[req.method];
  if (!action) return next(); // GET et autres : ignorés

  // /!\ Capturer MAINTENANT : req.path est réécrit par Express dans les sous-routeurs.
  const pathOnly = (req.originalUrl || req.url).split('?')[0];
  if (IGNORE.some((p) => pathOnly.startsWith(p))) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return; // opérations échouées : non journalisées

    // /api/utilisateurs/9/statut -> ['api','utilisateurs','9','statut']
    const seg = pathOnly.split('/').filter(Boolean);
    const entiteSlug = seg[1] || null;
    const idCandidat = seg[2];
    const entite_id = idCandidat && /^\d+$/.test(idCandidat) ? Number(idCandidat) : null;
    // sous-action = 4e segment, ou 3e si non numérique (ex: /uploads/image)
    const sousSlug = seg[3] || (seg[2] && !/^\d+$/.test(seg[2]) ? seg[2] : null);

    const label = ENTITES[entiteSlug] || entiteSlug || 'ressource';
    const idTxt = entite_id ? ` #${entite_id}` : '';

    let details;
    if (sousSlug && SOUS_ACTIONS[sousSlug]) {
      details = `${SOUS_ACTIONS[sousSlug]} — ${label}${idTxt}`;
    } else {
      details = `${VERBES[action]} — ${label}${idTxt}`;
    }

    auditService.enregistrer({
      utilisateur_id: req.utilisateur?.id || null,
      action,
      entite: entiteSlug,
      entite_id,
      details,
    });
  });

  next();
}

module.exports = { journaliser };
