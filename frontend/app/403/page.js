'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldX, Home, LogOut, Lock } from 'lucide-react';

/**
 * @component Page403
 * @description Page « Accès interdit » (HTTP 403) affichée lorsqu'un utilisateur
 * authentifié tente d'accéder à une page que son rôle n'autorise pas. Servie par
 * réécriture du middleware : l'URL demandée reste affichée, sans flash ni redirection.
 */
export default function Page403() {
  const [role, setRole] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    try {
      setRole(localStorage.getItem('userRole') || '');
      setUserName(localStorage.getItem('userName') || '');
    } catch { /* ignore */ }
  }, []);

  const roleLabel = {
    super_admin: 'Super administrateur',
    magasinier: 'Magasinier',
    technicien: 'Technicien',
    consultant: 'Consultant',
  }[role] || role || 'Utilisateur';

  const handleLogout = async () => {
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/utilisateurs/deconnexion', {
        method: 'POST', credentials: 'include',
      });
    } catch { /* ignore */ }
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-base-100 to-base-200/60 p-4 relative overflow-hidden">
      {/* Décor d'arrière-plan */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-blob hidden md:block" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-blob animation-delay-2000 hidden md:block" />

      <div className="card w-full max-w-lg bg-base-100 shadow-2xl border border-base-200 z-10">
        <div className="card-body items-center text-center p-8 sm:p-12">

          {/* Icône */}
          <div className="relative mb-2">
            <div className="w-24 h-24 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/10">
              <ShieldX className="w-12 h-12" />
            </div>
            <span className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-base-100 border border-base-200 flex items-center justify-center text-rose-500 shadow">
              <Lock className="w-4 h-4" />
            </span>
          </div>

          {/* Code 403 */}
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-rose-500 to-primary bg-clip-text text-transparent mt-4">
            403
          </h1>
          <h2 className="text-2xl font-bold text-base-content mt-1">Accès interdit</h2>

          {/* Message */}
          <p className="text-base-content/70 mt-3 leading-relaxed max-w-md">
            Vous êtes bien authentifié, mais votre niveau de permission est insuffisant
            pour accéder à cette page. Cette section est réservée à des rôles disposant
            d'habilitations supérieures.
          </p>

          {/* Badge de rôle */}
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-base-200/70 text-sm">
            <span className="text-base-content/50 font-medium">Connecté en tant que</span>
            <span className="badge badge-primary badge-sm font-semibold py-2.5 px-2.5 rounded-lg">{roleLabel}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full">
            <Link href="/" className="btn btn-primary rounded-xl gap-2 flex-1 shadow-lg shadow-primary/25">
              <Home className="w-4 h-4" /> Retour à l'accueil
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost rounded-xl gap-2 flex-1 text-base-content/70 hover:bg-base-200">
              <LogOut className="w-4 h-4" /> Changer de compte
            </button>
          </div>

          <p className="text-xs text-base-content/40 mt-6">
            Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}
