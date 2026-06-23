'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes, Users, LayoutDashboard, Package, Layers,
  Truck, Tag, Building2, Warehouse, Wrench, X, ClipboardList, ScrollText,
  ChevronsLeft, ChevronsRight, Mail, FileDown,
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
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Compteur de messages non lus (badge sur « Messagerie »).
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/messages/non-lus', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadMessages(data.non_lus ?? 0);
    } catch { /* silencieux : le badge se mettra à jour au prochain cycle */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 45000); // rafraîchissement périodique
    const onFocus = () => fetchUnread();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [fetchUnread]);

  // Rafraîchit aussi à chaque changement de page (ex. après lecture dans /messages).
  useEffect(() => { fetchUnread(); }, [pathname, fetchUnread]);

  // Menu regroupé par domaine. Chaque groupe n'est affiché que s'il a des liens visibles (RBAC).
  const navGroups = [
    { titre: null, items: [
      { href: '/',            label: 'Dashboard',    icon: LayoutDashboard, module: null },
      { href: '/messages',    label: 'Messagerie',   icon: Mail,            module: null },
    ] },
    { titre: 'Référentiel', items: [
      { href: '/produits',    label: 'Produits',     icon: Package,         module: 'produits' },
      { href: '/categories',  label: 'Catégories',   icon: Tag,             module: 'categories' },
      { href: '/fournisseurs',label: 'Fournisseurs', icon: Building2,       module: 'fournisseurs' },
      { href: '/entrepots',   label: 'Entrepôts',    icon: Warehouse,       module: 'entrepots' },
    ] },
    { titre: 'Stock & Parc', items: [
      { href: '/inventaire',  label: 'Inventaire',   icon: ClipboardList,   module: 'stocks' },
      { href: '/actifs',      label: 'Actifs',       icon: Layers,          module: 'actifs' },
      { href: '/mouvements',  label: 'Mouvements',   icon: Truck,           module: 'mouvements' },
      { href: '/bons-sortie', label: 'Bons de sortie', icon: FileDown,      module: 'mouvements' },
      { href: '/maintenances',label: 'Maintenance',  icon: Wrench,          module: 'maintenances' },
    ] },
    { titre: 'Administration', items: [
      { href: '/utilisateurs',label: 'Utilisateurs', icon: Users,           module: 'utilisateurs' },
      { href: '/journaux',    label: 'Journaux',     icon: ScrollText,      module: 'journaux' },
    ] },
  ];

  const estVisible = (link) => link.module === null || canAccess(link.module, 'read');

  const renderLink = (link) => {
    const Icon = link.icon;
    const isActive = pathname === link.href;
    const badge = link.href === '/messages' ? unreadMessages : 0;
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onClose}
        title={collapsed ? link.label : undefined}
        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group
          ${collapsed ? 'lg:justify-center' : ''}
          ${isActive
            ? 'bg-primary/10 text-primary font-bold shadow-sm'
            : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'}`}
      >
        <span className="relative shrink-0">
          <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? '' : 'text-base-content/60 group-hover:text-base-content'}`} />
          {/* Pastille en mode réduit (icônes seules) */}
          {badge > 0 && collapsed && (
            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-base-100 hidden lg:block" />
          )}
        </span>
        <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{link.label}</span>
        {/* Badge chiffré (mode étendu / mobile) */}
        {badge > 0 && (
          <span className={`ml-auto badge badge-sm border-0 bg-rose-500 text-white font-bold ${collapsed ? 'lg:hidden' : ''}`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    );
  };

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

        {/* Navigation regroupée par domaine */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
          {navGroups.map((group, gi) => {
            const items = group.items.filter(estVisible);
            if (items.length === 0) return null;
            return (
              <div key={group.titre || `groupe-${gi}`} className={gi > 0 ? 'mt-4' : ''}>
                {/* Titre de groupe (masqué en mode réduit, remplacé par un séparateur) */}
                {group.titre && (
                  <p className={`px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-base-content/40 ${collapsed ? 'lg:hidden' : ''}`}>
                    {group.titre}
                  </p>
                )}
                {group.titre && collapsed && <div className="hidden lg:block border-t border-base-200 mx-2 mb-2" />}
                <div className="space-y-1">
                  {items.map(renderLink)}
                </div>
              </div>
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
