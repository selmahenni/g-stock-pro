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

// Fonction de décodage JWT 100% sécurisée pour le Edge Runtime
function lireRole(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded.role || null;
  } catch (err) {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const role = token ? lireRole(token) : null;
  const isLogin = pathname.startsWith('/login');

  // 1) Utilisateur NON authentifié
  if (!role) {
    if (isLogin) return NextResponse.next();
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  // 2) Utilisateur authentifié -> bloque l'accès à la page de login
  if (isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3) Vérification RBAC
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
    /* Exclut les routes API, les fichiers statiques Next, et tous les fichiers avec extension (images, css, etc.) */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]*$).*)',
  ],
};