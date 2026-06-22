'use client';

import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * @component DataTableServer
 * @description Tableau à pagination et recherche **côté serveur** (TanStack Table en mode
 * manuel). Les données affichées sont uniquement la page demandée. L'état (page, taille,
 * recherche) est piloté par le parent, généralement via TanStack Query.
 *
 * @param {Array}  columns           - Définition des colonnes TanStack.
 * @param {Array}  data              - Lignes de la page courante (déjà paginées par le serveur).
 * @param {number} total             - Nombre total d'éléments (toutes pages).
 * @param {number} pageCount         - Nombre total de pages.
 * @param {Object} pagination        - { pageIndex, pageSize }.
 * @param {Function} onPaginationChange - Setter de pagination (compatible updater TanStack).
 * @param {string} search            - Terme de recherche courant.
 * @param {Function} onSearchChange  - Appelé (débouncé) avec le nouveau terme.
 * @param {boolean} loading          - Affiche un état de chargement.
 * @param {string} searchPlaceholder - Placeholder de la barre de recherche.
 * @param {React.ReactNode} toolbar  - Contenu additionnel (ex: boutons d'export).
 */
export default function DataTableServer({
  columns,
  data = [],
  total = 0,
  pageCount = 0,
  pagination,
  onPaginationChange,
  search = '',
  onSearchChange,
  loading = false,
  searchPlaceholder = 'Rechercher...',
  toolbar = null,
}) {
  // Recherche locale débouncée → remonte au parent
  const [localSearch, setLocalSearch] = useState(search);
  useEffect(() => { setLocalSearch(search); }, [search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search) onSearchChange?.(localSearch);
    }, 350);
    return () => clearTimeout(t);
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: { pagination },
    onPaginationChange,
    manualPagination: true,
    manualFiltering: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const { pageIndex, pageSize } = pagination;
  const from = total > 0 ? pageIndex * pageSize + 1 : 0;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  // Alignement par colonne via columnDef.meta.align ('right' | 'center' | 'left')
  const alignClass = (column) => {
    const a = column.columnDef.meta?.align;
    if (a === 'right') return 'text-right';
    if (a === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="w-full bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden transition-all duration-300">
      {/* Barre d'outils */}
      <div className="p-5 border-b border-base-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="relative w-full lg:max-w-xs">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="input input-bordered w-full pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          {loading && <span className="loading loading-spinner loading-xs absolute right-3 top-1/2 -translate-y-1/2 text-primary"></span>}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {toolbar}
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <span className="hidden sm:inline">Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="select select-bordered select-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {[10, 20, 30, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table (scroll horizontal + vertical avec en-tête collant) */}
      <div className="overflow-auto w-full relative max-h-[70vh]">
        <table className="table table-md w-full">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-base-100 text-base-content/50 border-b border-base-300">
                {hg.headers.map((header) => (
                  <th key={header.id} className={`py-3.5 px-6 select-none text-xs font-semibold uppercase tracking-wider ${alignClass(header.column)}`}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-base-200/60 hover:bg-base-200/60 transition-colors duration-150">
                  {row.getVisibleCells().map((cell) => {
                    const isRight = cell.column.columnDef.meta?.align === 'right';
                    return (
                      <td key={cell.id} className={`py-4 px-6 text-sm align-middle ${alignClass(cell.column)} ${isRight ? 'tabular-nums font-medium' : ''}`}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-base-content/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-base font-semibold">{loading ? 'Chargement...' : 'Aucun résultat trouvé'}</p>
                    {!loading && <p className="text-xs">Essayez d'ajuster votre recherche.</p>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-5 border-t border-base-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-base-content/60">
          Affichage de <span className="font-semibold text-base-content">{from}</span> à{' '}
          <span className="font-semibold text-base-content">{to}</span> sur{' '}
          <span className="font-semibold text-base-content">{total}</span> éléments
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40" title="Première page"><ChevronsLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40" title="Précédent"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-xs px-3 py-1 bg-base-200 text-base-content font-medium rounded-lg">Page {pageIndex + 1} sur {pageCount || 1}</span>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40" title="Suivant"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40" title="Dernière page"><ChevronsRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
