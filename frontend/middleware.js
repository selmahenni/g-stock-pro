import { NextResponse } from 'next/server';

export function middleware(request) {
  // Récupérer le token depuis les cookies de la requête entrante
  const token = request.cookies.get('token')?.value;

  // Analyser l'URL actuelle
  const { pathname } = request.nextUrl;

  // Routes qui ne nécessitent pas d'authentification
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.');

  // 1. Si l'utilisateur n'est PAS connecté
  if (!token) {
    // S'il essaie d'accéder à une route privée (ex: /, /utilisateurs), le rediriger vers /login
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Si l'utilisateur EST connecté
  if (token) {
    // S'il essaie d'accéder à /login, le rediriger vers la page principale
    if (pathname === '/login') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Dans tous les autres cas, laisser passer la requête
  return NextResponse.next();
}

// Configurer le matcher pour appliquer le middleware uniquement sur certaines routes
export const config = {
  matcher: [
    /*
     * Appliquer le middleware sur toutes les requêtes SAUF:
     * - api (API routes)
     * - _next/static (fichiers statiques)
     * - _next/image (images d'optimisation)
     * - favicon.ico (icône du site)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
