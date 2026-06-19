'use client';

import React from 'react';
import Link from 'next/link';
import { Boxes, Menu } from 'lucide-react';
import Notifications from './Notifications';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

/**
 * @component Navbar
 * @description Barre supérieure épurée. La navigation principale vit désormais
 * dans la Sidebar latérale. La Navbar ne conserve que :
 *  - le bouton hamburger (ouverture du tiroir sur mobile),
 *  - le logo (visible uniquement sur mobile, la Sidebar le porte sur desktop),
 *  - le système de Notifications,
 *  - le toggle thème clair/sombre,
 *  - l'avatar utilisateur (avec déconnexion).
 *
 * @param {Function} onMenuClick - Ouvre le tiroir Sidebar sur mobile.
 */
export default function Navbar({ onMenuClick }) {
  return (
    <header className="navbar sticky top-0 z-30 bg-base-100/80 backdrop-blur-md border-b border-base-200 px-4 md:px-6 shadow-sm min-h-16">
      <div className="flex-1 flex items-center gap-2">
        {/* Hamburger — mobile uniquement */}
        <button
          onClick={onMenuClick}
          className="btn btn-ghost btn-circle lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo — mobile uniquement (la Sidebar l'affiche sur desktop) */}
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <div className="bg-primary text-primary-content p-1.5 rounded-lg">
            <Boxes className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden sm:block">
            G-STOCK PRO
          </span>
        </Link>
      </div>

      <div className="flex-none flex items-center gap-1">
        <ThemeToggle />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
}
