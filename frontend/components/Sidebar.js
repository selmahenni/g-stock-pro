'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes, Users, LayoutDashboard, Package, Layers,
  Truck, Tag, Building2, Warehouse, Wrench, X, ClipboardList,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import usePermissions from '../hooks/usePermissions';

/**
 * @component Sidebar
 * @description Barre latérale de navigation principale (PWA-friendly).
 * - Desktop : panneau fixe rétractable (icônes seules en mode réduit).
 * - Mobile  : tiroir off-canvas avec overlay (menu hamburger).
 * Les liens sont filtrés selon le rôle RBAC de l'utilisateur connecté.
 *
 * @param {boolean} collapsed       - Mode réduit (icônes seules) sur desktop.
 * @param {boolean} mobileOpen      - Tiroir ouvert sur mobile.
 * @param {Function} onClose        - Ferme le tiroir mobile.
 * @param {Function} onToggleCollapse - Bascule le mode réduit desktop.
 */
export default function Sidebar({ collapsed, mobileOpen, onClose, onToggleCollapse }) {
  const pathname = usePathname();
  const { canAccess } = usePermissions();

  const navLinks = [
    { href: '/',              label: 'Dashboard',     icon: LayoutDashboard, module: null },
    { href: '/utilisateurs',  label: 'Utilisateurs',  icon: Users,           module: 'utilisateurs' },
    { href: '/produits',      label: 'Produits',      icon: Package,         module: 'produits' },
    { href: '/inventaire',    label: 'Inventaire',    icon: ClipboardList,   module: 'stocks' },
    { href: '/actifs',        label: 'Actifs',        icon: Layers,          module: 'actifs' },
    { href: '/mouvements',    label: 'Mouvements',    icon: Truck,           module: 'mouvements' },
    { href: '/categories',    label: 'Catégories',    icon: Tag,             module: 'categories' },
    { href: '/fournisseurs',  label: 'Fournisseurs',  icon: Building2,       module: 'fournisseurs' },
    { href: '/entrepots',     label: 'Entrepôts',     icon: Warehouse,       module: 'entrepots' },
    { href: '/maintenances',  label: 'Maintenance',   icon: Wrench,          module: 'maintenances' },
  ];

  const visibleLinks = navLinks.filter(link => {
    if (link.module === null) return true;
    return canAccess(link.module, 'read');
  });

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-screen flex flex-col bg-base-100 border-r border-base-200 shadow-xl lg:shadow-none
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Header / Logo */}
        <div className={`flex items-center h-16 shrink-0 border-b border-base-200 ${collapsed ? 'lg:justify-center px-2' : 'px-4'} justify-between`}>
          <Link href="/" onClick={onClose} className="flex items-center gap-2 group min-w-0">
            <div className="bg-primary text-primary-content p-2 rounded-xl transition-transform group-hover:rotate-12 group-hover:scale-110 duration-300 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <span className={`font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent truncate ${collapsed ? 'lg:hidden' : ''}`}>
              G-STOCK PRO
            </span>
          </Link>

          {/* Fermer (mobile) */}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {visibleLinks.map(link => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                title={collapsed ? link.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group
                  ${collapsed ? 'lg:justify-center' : ''}
                  ${isActive
                    ? 'bg-primary/10 text-primary font-bold shadow-sm'
                    : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'}`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? '' : 'text-base-content/60 group-hover:text-base-content'}`} />
                <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Réduire / Étendre (desktop) */}
        <div className="hidden lg:block shrink-0 border-t border-base-200 p-3">
          <button
            onClick={onToggleCollapse}
            className={`flex items-center gap-2 w-full py-2 rounded-xl text-xs font-semibold text-base-content/60 hover:bg-base-200 hover:text-base-content transition-all ${collapsed ? 'justify-center' : 'justify-start px-2'}`}
            aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4" /> Réduire le menu
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
