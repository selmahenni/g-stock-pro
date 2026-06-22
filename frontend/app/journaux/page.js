'use client';

import React from 'react';
import DataTableServer from '../../components/DataTableServer';
import StatusBadge from '../../components/StatusBadge';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import {
  ScrollText, RefreshCw, AlertCircle, LogIn, ShieldAlert,
  PlusCircle, Pencil, Trash2, Activity,
} from 'lucide-react';

/**
 * @component PageJournaux
 * @description Journal de sécurité (audit) en lecture seule, réservé au super-administrateur.
 * Trace les connexions, créations, modifications et suppressions. Pagination serveur.
 */
export default function PageJournaux() {
  const journal = usePaginatedResource('journaux', 'journaux', { pageSize: 20 });

  // action métier → tonalité + icône (rendu via le composant unifié StatusBadge)
  const actionMeta = {
    connexion:       { label: 'Connexion',    tone: 'success', icon: LogIn },
    connexion_echec: { label: 'Échec login',  tone: 'error',   icon: ShieldAlert },
    creation:        { label: 'Création',     tone: 'info',    icon: PlusCircle },
    modification:    { label: 'Modification', tone: 'warning', icon: Pencil },
    suppression:     { label: 'Suppression',  tone: 'error',   icon: Trash2 },
  };

  const columns = [
    {
      accessorKey: 'cree_le',
      header: 'Date',
      cell: (info) => {
        const d = info.getValue();
        if (!d) return '—';
        return <span className="text-xs text-base-content/70 whitespace-nowrap">{new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>;
      },
    },
    {
      accessorKey: 'utilisateur_nom',
      header: 'Auteur',
      cell: (info) => {
        const nom = info.getValue();
        if (!nom) return <span className="inline-flex items-center gap-1 text-xs text-base-content/50"><Activity className="w-3 h-3" /> Système</span>;
        return (
          <div>
            <div className="font-semibold text-sm text-base-content/90">{nom}</div>
            <div className="text-xs text-base-content/50">{info.row.original.utilisateur_role || '—'}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: (info) => {
        const m = actionMeta[info.getValue()] || { label: info.getValue() || '—', tone: 'neutral', icon: Activity };
        return <StatusBadge label={m.label} tone={m.tone} icon={m.icon} />;
      },
    },
    {
      accessorKey: 'entite',
      header: 'Entité',
      cell: (info) => {
        const e = info.getValue();
        if (!e) return <span className="text-base-content/40">—</span>;
        const id = info.row.original.entite_id;
        return <span className="text-sm">{e}{id ? <span className="text-base-content/40 font-mono"> #{id}</span> : ''}</span>;
      },
    },
    {
      accessorKey: 'details',
      header: 'Détails',
      cell: (info) => <span className="text-xs text-base-content/60 font-mono line-clamp-2 max-w-[320px]">{info.getValue() || '—'}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content flex items-center gap-2">
              <ScrollText className="w-7 h-7 text-primary" /> Journaux de sécurité
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {journal.isFetching ? 'Chargement...' : `${journal.total} événement(s) — traçabilité des connexions et des opérations (lecture seule).`}
            </p>
          </div>
          <button onClick={() => journal.refetch()} disabled={journal.isFetching} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
            <RefreshCw className={`w-4 h-4 ${journal.isFetching ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {journal.isError ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur</h3>
              <p className="text-sm text-base-content/70 mt-1">{journal.error?.message}</p>
              <button onClick={() => journal.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : (
          <DataTableServer
            columns={columns}
            data={journal.rows}
            total={journal.total}
            pageCount={journal.pageCount}
            pagination={journal.pagination}
            onPaginationChange={journal.setPagination}
            search={journal.search}
            onSearchChange={journal.onSearchChange}
            loading={journal.isFetching}
            searchPlaceholder="Rechercher par action, entité, auteur..."
          />
        )}
      </div>
    </div>
  );
}
