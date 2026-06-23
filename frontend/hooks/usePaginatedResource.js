'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const API = 'http://localhost:5000/api';

/**
 * @hook usePaginatedResource
 * @description Encapsule la pagination + recherche côté serveur via TanStack Query.
 * Ne charge que la page demandée. Gère l'état (page, taille, recherche) et expose
 * de quoi piloter <DataTableServer> ainsi qu'un `fetchAll` pour l'export.
 *
 * @param {string} path    - Segment d'API (ex: 'produits', 'actifs', 'stocks').
 * @param {string} dataKey - Clé du tableau dans la réponse (ex: 'produits').
 * @param {Object} [opts]  - { pageSize }.
 */
export default function usePaginatedResource(path, dataKey, { pageSize = 10, filters: initialFilters = {} } = {}) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const [search, setSearch] = useState('');
  const [filters, setFiltersState] = useState(initialFilters);

  // Ne garde que les filtres réellement renseignés (valeur non vide), en chaînes.
  const filterParams = Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => [k, String(v)])
  );

  const query = useQuery({
    queryKey: [path, pagination.pageIndex, pagination.pageSize, search, JSON.stringify(filterParams)],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        ...(search ? { search } : {}),
        ...filterParams,
      });
      const res = await fetch(`${API}/${path}?${params.toString()}`, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return null; }
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      return res.json();
    },
    placeholderData: (prev) => prev, // conserve l'ancienne page pendant le chargement (v5)
  });

  // Reset en page 1 quand la recherche change
  const onSearchChange = (val) => {
    setSearch(val);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  // Met à jour les filtres et revient en page 1
  const setFilters = (next) => {
    setFiltersState(typeof next === 'function' ? next : next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  // Récupère TOUTES les lignes (recherche + filtres courants inclus) pour l'export
  const fetchAll = async () => {
    const params = new URLSearchParams({ page: '1', limit: '100000', ...(search ? { search } : {}), ...filterParams });
    const res = await fetch(`${API}/${path}?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
    const data = await res.json();
    return data?.[dataKey] ?? [];
  };

  const data = query.data;
  return {
    data,                                  // réponse brute (pour des champs additionnels : stats…)
    rows: data?.[dataKey] ?? [],
    total: data?.metadata?.total_items ?? 0,
    pageCount: data?.metadata?.total_pages ?? 0,
    pagination,
    setPagination,
    search,
    onSearchChange,
    filters,
    setFilters,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    fetchAll,
  };
}
