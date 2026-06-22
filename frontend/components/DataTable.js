'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * @component DataTable
 * @description Un composant de tableau dynamique générique et réutilisable utilisant TanStack Table et stylisé avec DaisyUI.
 * @param {Object} props - Propriétés du composant.
 * @param {Array<Object>} props.columns - Configuration des colonnes TanStack Table.
 * @param {Array<Object>} props.data - Tableau de données à afficher.
 * @param {string} [props.searchPlaceholder="Rechercher..."] - Texte d'aide de la barre de recherche.
 * @returns {React.JSX.Element} Le tableau dynamique rendu.
 */
export default function DataTable({
  columns,
  data,
  searchPlaceholder = 'Rechercher...',
}) {
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Alignement par colonne via columnDef.meta.align ('right' | 'center' | 'left')
  const alignClass = (column) => {
    const a = column.columnDef.meta?.align;
    if (a === 'right') return 'text-right';
    if (a === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="w-full bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden transition-all duration-300">
      {/* Barre d'outils supérieure */}
      <div className="p-5 border-b border-base-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="input input-bordered w-full pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        </div>

        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <span>Afficher</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="select select-bordered select-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {[5, 10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} lignes
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteneur de la table */}
      <div className="overflow-x-auto w-full">
        <table className="table table-md w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-base-100 text-base-content/50 border-b border-base-300">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className={`py-4 px-6 select-none text-xs font-semibold uppercase tracking-wider ${alignClass(header.column)}`}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-base-200/60 hover:bg-base-200/60 transition-colors duration-150"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isRight = cell.column.columnDef.meta?.align === 'right';
                    return (
                      <td key={cell.id} className={`py-4 px-6 text-sm align-middle ${alignClass(cell.column)} ${isRight ? 'tabular-nums' : ''}`}>
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
                    <p className="text-base font-semibold">Aucun résultat trouvé</p>
                    <p className="text-xs">Essayez d'ajuster votre recherche ou vos filtres.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Barre de pagination inférieure */}
      <div className="p-5 border-t border-base-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-base-content/60">
          Affichage de{' '}
          <span className="font-semibold text-base-content">
            {table.getRowModel().rows.length > 0
              ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
              : 0}
          </span>{' '}
          à{' '}
          <span className="font-semibold text-base-content">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </span>{' '}
          sur{' '}
          <span className="font-semibold text-base-content">
            {table.getFilteredRowModel().rows.length}
          </span>{' '}
          éléments
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40"
            title="Première page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40"
            title="Page précédente"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs px-3 py-1 bg-base-200 text-base-content font-medium rounded-lg">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount() || 1}
          </span>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40"
            title="Page suivante"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="btn btn-outline btn-xs rounded-lg border-base-300 hover:bg-base-200 disabled:opacity-40"
            title="Dernière page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
