'use client';

import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import usePermissions from '../hooks/usePermissions';

/**
 * @component UserMenu
 * @description Avatar de l'utilisateur connecté + menu déroulant (nom, rôle, déconnexion).
 * Affiché dans la Navbar.
 */
export default function UserMenu() {
  const { role } = usePermissions();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    try {
      const storedName = localStorage.getItem('userName');
      if (storedName) setUserName(storedName);
    } catch { /* ignore */ }
  }, []);

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'GS';

  const roleBadge = {
    super_admin: { label: 'Super Admin', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    magasinier:  { label: 'Magasinier',  className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    technicien:  { label: 'Technicien',  className: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
    consultant:  { label: 'Consultant',  className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  };
  const currentBadge = roleBadge[role] || { label: role || '...', className: 'badge-ghost' };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/utilisateurs/deconnexion', {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore */ }

    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');

    window.location.href = '/login';
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder" aria-label="Menu utilisateur">
        <div className="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-10 transition-transform hover:scale-105 duration-200">
          <span className="font-bold text-xs">{initials}</span>
        </div>
      </div>
      <ul tabIndex={0} className="mt-3 z-[60] p-3 shadow-xl menu menu-sm dropdown-content bg-base-100 rounded-2xl w-60 border border-base-200 space-y-1">
        <li className="px-3 py-2">
          <div className="flex flex-col gap-1 cursor-default hover:bg-transparent">
            <span className="font-bold text-base-content text-sm">{userName || 'Utilisateur'}</span>
            <span className={`badge badge-sm py-2 px-2.5 rounded-lg font-semibold border ${currentBadge.className}`}>
              {currentBadge.label}
            </span>
          </div>
        </li>
        <div className="divider my-0.5"></div>
        <li>
          <button
            onClick={handleLogout}
            className="text-rose-500 font-semibold hover:bg-rose-500/10 hover:text-rose-600 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </li>
      </ul>
    </div>
  );
}
