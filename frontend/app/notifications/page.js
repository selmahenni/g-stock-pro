'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bell, RefreshCw, AlertCircle, CheckCheck, Check, CheckCircle2,
  AlertTriangle, Wrench, PackagePlus, Info, Mail,
} from 'lucide-react';

/**
 * @component PageNotifications
 * @description Page dédiée aux notifications de l'utilisateur connecté.
 * Types gérés :
 *  - maintenance  → technicien (affectation d'intervention)
 *  - mouvement    → magasinier (entrée de stock / ajout de produits)
 *  - alerte_stock → super-admin & magasinier (seuil critique, aussi notifié par email)
 */
export default function PageNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtre, setFiltre] = useState('toutes'); // 'toutes' | type_notif

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/notifications?limit=100', {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
        throw new Error(`Erreur serveur (${res.status})`);
      }
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.non_lues ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, est_lu: true } : n)));
    setUnread(prev => Math.max(prev - 1, 0));
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${id}/lu`, { method: 'PATCH', credentials: 'include' });
    } catch { /* resync au prochain fetch */ }
  };

  const markAllRead = async () => {
    setItems(prev => prev.map(n => ({ ...n, est_lu: true })));
    setUnread(0);
    try {
      await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/notifications/tout-lu', { method: 'PATCH', credentials: 'include' });
    } catch { /* ignore */ }
  };

  const typeMeta = {
    maintenance:  { label: 'Maintenance', cible: 'Technicien', icon: Wrench,        cls: 'text-sky-600 bg-sky-500/10 border-sky-500/20' },
    mouvement:    { label: 'Mouvement',   cible: 'Magasinier', icon: PackagePlus,   cls: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
    alerte_stock: { label: 'Stock',       cible: 'Super-admin / Magasinier', icon: AlertTriangle, cls: 'text-error bg-rose-500/10 border-rose-500/20' },
  };

  // Compteurs par type
  const compteurs = useMemo(() => {
    const c = { maintenance: 0, mouvement: 0, alerte_stock: 0 };
    items.forEach(n => { if (c[n.type_notif] != null) c[n.type_notif] += 1; });
    return c;
  }, [items]);

  const itemsFiltres = filtre === 'toutes' ? items : items.filter(n => n.type_notif === filtre);

  const onglets = [
    { key: 'toutes', label: 'Toutes', count: items.length },
    { key: 'maintenance', label: 'Maintenance', count: compteurs.maintenance },
    { key: 'mouvement', label: 'Mouvements', count: compteurs.mouvement },
    { key: 'alerte_stock', label: 'Stock', count: compteurs.alerte_stock },
  ];

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content flex items-center gap-2">
              <Bell className="w-7 h-7 text-primary" /> Notifications
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {unread > 0 ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : 'Vous êtes à jour.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchNotifications} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {unread > 0 && (
              <button onClick={markAllRead} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <CheckCheck className="w-4 h-4" /> Tout marquer lu
              </button>
            )}
          </div>
        </div>

        {/* Onglets de filtre */}
        <div className="flex flex-wrap gap-2">
          {onglets.map(o => (
            <button
              key={o.key}
              onClick={() => setFiltre(o.key)}
              className={`btn btn-sm rounded-xl gap-2 ${filtre === o.key ? 'btn-primary' : 'btn-ghost border border-base-200'}`}
            >
              {o.label}
              <span className={`badge badge-sm ${filtre === o.key ? 'bg-primary-content/20 text-primary-content border-0' : 'badge-ghost'}`}>{o.count}</span>
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des notifications...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur</h3>
              <p className="text-sm text-base-content/70 mt-1">{error}</p>
              <button onClick={fetchNotifications} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : itemsFiltres.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 bg-base-100 rounded-2xl shadow-md border border-base-200 text-center">
            <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500"><CheckCircle2 className="w-8 h-8" /></div>
            <p className="text-base font-semibold text-base-content/70">Aucune notification</p>
            <p className="text-sm text-base-content/50">Rien à afficher dans cette catégorie.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {itemsFiltres.map(n => {
              const m = typeMeta[n.type_notif] || { label: 'Info', cible: '', icon: Info, cls: 'text-base-content/60 bg-base-200 border-base-200' };
              const Icon = m.icon;
              return (
                <li
                  key={n.id}
                  className={`bg-base-100 rounded-2xl border shadow-sm hover:shadow-md transition-all ${n.est_lu ? 'border-base-200' : 'border-primary/30 bg-primary/[0.03]'}`}
                >
                  <div className="flex items-start gap-4 p-4">
                    <span className={`p-2.5 rounded-xl shrink-0 border ${m.cls}`}>
                      <Icon className="w-5 h-5" />
                    </span>

                    <Link
                      href={n.lien || '#'}
                      onClick={() => { if (!n.est_lu) markRead(n.id); }}
                      className="min-w-0 flex-1 group"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base-content/90 group-hover:text-primary transition-colors">{n.titre}</span>
                        <span className={`badge badge-sm rounded-md font-semibold border ${m.cls}`}>{m.label}</span>
                        {n.email_envoye && (
                          <span
                            className="badge badge-sm rounded-md font-semibold border text-violet-600 bg-violet-500/10 border-violet-500/20 gap-1"
                            title="Cette notification vous a aussi été envoyée par e-mail"
                          >
                            <Mail className="w-3 h-3" /> E-mail
                          </span>
                        )}
                        {!n.est_lu && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm text-base-content/70 mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-base-content/40">
                        <span>{fmtDate(n.cree_le)}</span>
                        {m.cible && <span className="hidden sm:inline">· Destinataire : {m.cible}</span>}
                      </div>
                    </Link>

                    {!n.est_lu && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-primary shrink-0"
                        title="Marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
