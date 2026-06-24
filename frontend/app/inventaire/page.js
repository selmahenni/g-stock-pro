'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DataTableServer from '../../components/DataTableServer';
import ExportButtons from '../../components/ExportButtons';
import FilterSelect from '../../components/FilterSelect';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import usePermissions from '../../hooks/usePermissions';
import { StockAlertBadge } from '../../components/StatusBadge';
import { Boxes, AlertTriangle, RefreshCw, AlertCircle, ScanLine, ClipboardCheck } from 'lucide-react';

// Scanners caméra : chargés uniquement côté client.
const AuditScanner = dynamic(() => import('../../components/AuditScanner'), { ssr: false }); // audit article-par-article
const AuditSession = dynamic(() => import('../../components/AuditSession'), { ssr: false }); // session cumulative

/**
 * @component PageInventaire
 * @description Datatable des « Lignes d'inventaire » (table stocks) avec pagination
 * et recherche côté serveur (TanStack Query) + export PDF/Excel.
 */
export default function PageInventaire() {
  const inv = usePaginatedResource('stocks', 'stocks', { pageSize: 10 });
  const { canAccess } = usePermissions();
  const [showAudit, setShowAudit] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [entrepots, setEntrepots] = useState([]);
  const canAudit = canAccess('actifs', 'update'); // super_admin, magasinier (mise à jour pendant l'audit)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/entrepots', { credentials: 'include' });
        if (res.ok) { const d = await res.json(); setEntrepots(Array.isArray(d) ? d : (d.entrepots || [])); }
      } catch { /* le filtre restera vide */ }
    })();
  }, []);

  const columns = [
    {
      accessorKey: 'produit_libelle',
      header: 'Produit',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary"><Boxes className="w-4 h-4" /></div>
          <div>
            <div className="font-bold text-base-content/90">{info.getValue() || '—'}</div>
            <div className="text-xs text-base-content/50 font-mono">{info.row.original.sku || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'entrepot_nom',
      header: 'Entrepôt',
      cell: (info) => {
        const r = info.row.original;
        // Entrepôt désactivé alors qu'il contient encore des actifs → à évacuer.
        const aEvacuer = r.entrepot_actif === false && (r.quantite ?? 0) > 0;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="text-sm">{info.getValue() || '—'}</span>
            {aEvacuer && (
              <span
                className="inline-flex items-center gap-1 badge badge-sm py-2 px-2 rounded-lg font-semibold bg-rose-500/10 text-error border border-rose-500/20 whitespace-nowrap"
                title="Cet entrepôt est désactivé : transférez ou sortez ces actifs au plus vite."
              >
                <AlertTriangle className="w-3 h-3" /> Entrepôt inactif — à évacuer
              </span>
            )}
          </div>
        );
      },
    },
    { accessorKey: 'numero_lot', header: 'N° Lot', cell: (info) => <span className="font-mono text-xs text-base-content/60">{info.getValue() || '—'}</span> },
    {
      accessorKey: 'numeros_serie',
      header: 'N° Série',
      cell: (info) => {
        const v = info.getValue();
        return v
          ? <span className="font-mono text-xs text-base-content/70 line-clamp-2 max-w-[220px]" title={v}>{v}</span>
          : <span className="text-base-content/40">—</span>;
      },
    },
    {
      accessorKey: 'quantite',
      header: 'Disponible',
      meta: { align: 'right' },
      cell: (info) => <span className="font-bold tabular-nums">{info.getValue() ?? 0}</span>,
    },
    {
      accessorKey: 'stock_critique',
      header: 'Seuil critique',
      cell: (info) => {
        const v = info.getValue();
        return v ? <span className="badge badge-sm bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">{v}</span> : <span className="text-base-content/40">—</span>;
      },
    },
    {
      accessorKey: 'en_alerte',
      header: 'État',
      cell: (info) => <StockAlertBadge enAlerte={!!info.getValue()} />,
    },
    {
      accessorKey: 'mis_a_jour_le',
      header: 'Mis à jour',
      cell: (info) => {
        const d = info.getValue();
        return d ? <span className="text-xs text-base-content/70">{new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span> : '—';
      },
    },
  ];

  // Colonnes d'export (valeurs brutes)
  const exportColumns = [
    { header: 'Produit', accessor: 'produit_libelle' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Entrepôt', accessor: 'entrepot_nom' },
    { header: 'N° Lot', accessor: 'numero_lot' },
    { header: 'N° Série', accessor: (r) => r.numeros_serie || '' },
    { header: 'Quantité', accessor: 'quantite' },
    { header: 'Stock minimum', accessor: 'stock_minimum' },
    { header: 'Seuil critique', accessor: 'stock_critique' },
    { header: 'Sous seuil', accessor: (r) => (r.en_alerte ? 'OUI' : 'non') },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content flex items-center gap-2">
              <Boxes className="w-7 h-7 text-primary" /> Lignes d'inventaire
            </h1>
            <p className="text-sm text-base-content/60 mt-1">{inv.isFetching ? 'Chargement...' : `${inv.total} ligne(s) de stock`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => inv.refetch()} disabled={inv.isFetching} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${inv.isFetching ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button onClick={() => setShowSession(true)} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all" title="Session d'audit physique (scan en continu)">
              <ClipboardCheck className="w-4 h-4" /> Session d'audit
            </button>
            {canAudit && (
              <button onClick={() => setShowAudit(true)} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all" title="Audit article par article (correction rapide)">
                <ScanLine className="w-4 h-4" /> Mode Audit
              </button>
            )}
          </div>
        </div>

        {inv.isError ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur</h3>
              <p className="text-sm text-base-content/70 mt-1">{inv.error?.message}</p>
              <button onClick={() => inv.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : (
          <DataTableServer
            columns={columns}
            data={inv.rows}
            total={inv.total}
            pageCount={inv.pageCount}
            pagination={inv.pagination}
            onPaginationChange={inv.setPagination}
            search={inv.search}
            onSearchChange={inv.onSearchChange}
            loading={inv.isFetching}
            searchPlaceholder="Rechercher par produit, entrepôt, lot, n° série..."
            toolbar={
              <div className="flex items-center gap-2 flex-wrap">
                <FilterSelect
                  value={inv.filters.entrepot_id}
                  onChange={(v) => inv.setFilters({ ...inv.filters, entrepot_id: v })}
                  options={entrepots.map(e => ({ value: e.id, label: e.nom }))}
                  allLabel="Tous les entrepôts"
                  title="Filtrer par entrepôt"
                />
                <ExportButtons filename="inventaire" title="Lignes d'inventaire" columns={exportColumns} fetchRows={inv.fetchAll} formats={['excel']} />
              </div>
            }
          />
        )}
      </div>

      {/* Mode Audit : scan → recherche actif → mise à jour rapide (article par article) */}
      {showAudit && (
        <AuditScanner onClose={() => setShowAudit(false)} onUpdated={() => inv.refetch()} />
      )}

      {/* Session d'audit : scan continu → liste cumulative → rapport d'écarts */}
      {showSession && (
        <AuditSession onClose={() => setShowSession(false)} />
      )}
    </div>
  );
}
