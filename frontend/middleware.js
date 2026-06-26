import { NextResponse } from 'next/server';

const ROUTE_ROLES = {
  '/utilisateurs': ['super_admin'],
  '/journaux':     ['super_admin'],
  '/inventaire':   ['super_admin', 'magasinier', 'consultant'],
  '/mouvements':   ['super_admin', 'magasinier', 'consultant'],
  '/categories':   ['super_admin', 'magasinier', 'consultant'],
  '/fournisseurs': ['super_admin', 'magasinier', 'consultant'],
  '/maintenances': ['super_admin', 'technicien', 'consultant'],
};

function lireRole(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // Padding sécurisé pour éviter que atob() ne crash
    const padding = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padding, '=');

    // Décodage robuste compatible avec le Edge Runtime de Vercel (support UTF-8)
    const binString = atob(padded);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    const decodedString = new TextDecoder().decode(bytes);
    const decoded = JSON.parse(decodedString);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded.role || null;
  } catch (error) {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('token')?.value;
  const role = token ? lireRole(token) : null;
  const isLogin = pathname.startsWith('/login');

  // 1) Utilisateur NON authentifié (401)
  if (!role) {
    if (isLogin) return NextResponse.next();
    
    // Construction d'URL absolue requise par Vercel Edge
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  // 2) Déjà authentifié et tente d'aller sur /login -> renvoi vers l'accueil
  if (isLogin) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.searchParams.delete('error');
    return NextResponse.redirect(homeUrl);
  }

  // 3) Authentifié mais rôle INSUFFISANT (403)
  const routeRestreinte = Object.keys(ROUTE_ROLES).find(
    (base) => pathname === base || pathname.startsWith(base + '/')
  );
  if (routeRestreinte && !ROUTE_ROLES[routeRestreinte].includes(role)) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = '/403';
    return NextResponse.rewrite(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  // MATCHER SÉCURISÉ : On exclut TOUS les fichiers statiques et API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js|css|woff|woff2|ttf|eot)$).*)',
  ],
};