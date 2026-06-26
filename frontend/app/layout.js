// frontend/app/layout.js
import './globals.css';
import AppShell from '../components/AppShell';
import Providers from '../components/Providers';

export const metadata = {
  title: 'G-Stock Pro — Gestion de Parc & Stock',
  description: 'Solution d\'élite pour la gestion de parc informatique, la traçabilité des consommables et le contrôle d\'accès par rôles (RBAC).',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'G-Stock Pro',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="gstock" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-base-200 text-base-content antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>

        {/* 🔴 SCRIPT D'ENREGISTREMENT DU SERVICE WORKER (PWA) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) { console.log('✅ PWA: Service Worker enregistré avec succès.'); },
                    function(err) { console.error('❌ PWA: Échec de l\\'enregistrement du Service Worker', err); }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}