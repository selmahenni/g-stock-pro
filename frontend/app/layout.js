import './globals.css';
import AppShell from '../components/AppShell';
import Providers from '../components/Providers';

export const metadata = {
  title: 'G-Stock Pro — Gestion de Parc & Stock',
  description: 'Solution d\'élite pour la gestion de parc informatique, la traçabilité des consommables et le contrôle d\'accès par rôles (RBAC).',
  manifest: '/manifest.json',
  themeColor: '#6419e6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-base-100 text-base-content antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}