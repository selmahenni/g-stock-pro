'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

/**
 * @component AppShell
 * @description Ossature applicative : Sidebar latérale + Navbar supérieure + contenu.
 * Gère l'état responsive (tiroir mobile, mode réduit desktop) et masque
 * complètement l'ossature sur la page de connexion.
 */
export default function AppShell({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restaure l'état réduit de la Sidebar (desktop)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('sidebarCollapsed') === '1');
    } catch { /* ignore */ }
  }, []);

  // Ferme le tiroir mobile à chaque changement de page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  // Page de connexion : aucune ossature
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-base-200/30">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
