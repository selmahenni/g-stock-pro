import { NextResponse } from 'next/server';

/**
 * Matrice des routes restreintes par rôle (miroir des droits de LECTURE du RBAC).
 * Une route absente de cette table est accessible à TOUT utilisateur authentifié
 * (ex: /, /produits, /actifs, /entrepots, /notifications, /403).
 */
const ROUTE_ROLES = {
  '/utilisateurs': ['super_admin'],
  '/journaux':     ['super_admin'],
  '/inventaire':   ['super_admin', 'magasinier', 'consultant'],
  '/mouvements':   ['super_admin', 'magasinier', 'consultant'],
  '/categories':   ['super_admin', 'magasinier', 'consultant'],
  '/fournisseurs': ['super_admin', 'magasinier', 'consultant'],
  '/maintenances': ['super_admin', 'technicien', 'consultant'],
};

/**
 * Décode le rôle contenu dans le JWT (payload base64url) sans vérifier la
 * signature : c'est suffisant pour le routage UX, la sécurité réelle étant
 * assurée par le backend (qui, lui, vérifie la signature à chaque requête API).
 * Compatible Edge Runtime (atob, pas de dépendance Node).
 * @returns {string|null} le rôle, ou null si absent / invalide / expiré.
 */
function lireRole(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded));
    // Jeton expiré -> considéré comme non authentifié
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded.role || null;
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Laisser passer l'API, les ressources Next et les fichiers statiques (avec extension)
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const role = token ? lireRole(token) : null;
  const isLogin = pathname === '/login';

  // 1) Utilisateur NON authentifié (401)
  if (!role) {
    if (isLogin) return NextResponse.next();
    // Tente d'accéder à une route privée -> redirection vers /login avec motif
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  // 2) Déjà authentifié et tente d'aller sur /login -> renvoi vers l'accueil
  if (isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3) Authentifié mais rôle INSUFFISANT (403) -> réécriture vers /403
  //    (l'URL demandée reste affichée, la page protégée n'est jamais rendue)
  const routeRestreinte = Object.keys(ROUTE_ROLES).find(
    (base) => pathname === base || pathname.startsWith(base + '/')
  );
  if (routeRestreinte && !ROUTE_ROLES[routeRestreinte].includes(role)) {
    return NextResponse.rewrite(new URL('/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les requêtes SAUF :
     * api (routes API), _next/static, _next/image, favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
