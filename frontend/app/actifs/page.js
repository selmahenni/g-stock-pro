'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DataTableServer from '../../components/DataTableServer';
import ExportButtons from '../../components/ExportButtons';
import ResourceModal from '../../components/ResourceModal';
import usePermissions from '../../hooks/usePermissions';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import {
  Layers, RefreshCw, AlertCircle, Plus, Pencil, Trash2,
  Monitor, CheckCircle2, XCircle, Clock, Eye, Wrench
} from 'lucide-react';

/**
 * @component PageActifs
 * @description Page de gestion du parc matériel (actifs physiques) avec RBAC.
 */
export default function PageActifs() {
  // Liste paginée côté serveur (TanStack Query)
  const list = usePaginatedResource('actifs', 'actifs', { pageSize: 10 });
  const actifs = list.rows;
  const [produits, setProduits] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    produit_id: '',
    numero_serie: '',
    entrepot_id: '',
    emplacement: '',
    prix_unitaire: '',
    statut: 'en_stock',
  });
  const { canAccess } = usePermissions();

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [produitsRes, entrepotsRes] = await Promise.all([
          fetch('http://localhost:5000/api/produits?limit=500', { credentials: 'include' }),
          fetch('http://localhost:5000/api/entrepots', { credentials: 'include' }),
        ]);
        if (produitsRes.ok) {
          const data = await produitsRes.json();
          setProduits(data.produits || []);
        }
        if (entrepotsRes.ok) {
          const data = await entrepotsRes.json();
          setEntrepots(Array.isArray(data) ? data : (data.entrepots || []));
        }
      } catch {}
    }
    fetchOptions();
  }, []);

  const canCreate = canAccess('actifs', 'create');
  const canUpdate = canAccess('actifs', 'update');
  const canDelete = canAccess('actifs', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de cet actif ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/actifs/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      list.refetch();
    } catch (err) { alert(err.message); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch('http://localhost:5000/api/actifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          produit_id: Number(formData.produit_id),
          numero_serie: formData.numero_serie,
          entrepot_id: Number(formData.entrepot_id),
          emplacement: formData.emplacement || null,
          prix_unitaire: formData.prix_unitaire ? Number(formData.prix_unitaire) : null,
          statut: formData.statut,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création de l’actif');
      setShowCreateModal(false);
      setFormData({ produit_id: '', numero_serie: '', entrepot_id: '', emplacement: '', prix_unitaire: '', statut: 'en_stock' });
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Colonnes d'export (valeurs brutes)
  const exportColumns = [
    { header: 'ID', accessor: 'id' },
    { header: 'N° Série', accessor: 'numero_serie' },
    { header: 'Produit', accessor: 'produit_libelle' },
    { header: 'Entrepôt', accessor: 'entrepot_nom' },
    { header: 'Emplacement', accessor: 'emplacement' },
    { header: 'Prix (DA)', accessor: 'prix_unitaire' },
    { header: 'Statut', accessor: 'statut' },
  ];

  const statutBadge = (statut) => {
    const map = {
      en_stock:    { label: 'En stock',    cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
      affecte:     { label: 'Affecté',     cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',    icon: Monitor },
      maintenance: { label: 'Maintenance', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20',       icon: Clock },
      rebut:       { label: 'Rebut',       cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20',          icon: XCircle },
    };
    const s = map[statut] || { label: statut || '—', cls: 'badge-ghost', icon: null };
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 badge badge-sm py-2 px-2.5 rounded-lg font-semibold border ${s.cls}`}>
        {Icon && <Icon className="w-3 h-3" />} {s.label}
      </span>
    );
  };

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'numero_serie',
      header: 'N° Série',
      cell: (info) => (
        <Link href={`/actifs/${info.row.original.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
          {info.getValue()}
        </Link>
      ),
    },
    {
      accessorKey: 'produit_libelle',
      header: 'Produit',
      cell: (info) => <span className="font-medium">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'entrepot_nom',
      header: 'Entrepôt',
      cell: (info) => <span className="text-sm">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'emplacement',
      header: 'Emplacement',
      cell: (info) => <span className="text-sm text-base-content/70">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'prix_unitaire',
      header: 'Prix (DA)',
      cell: (info) => {
        const val = parseFloat(info.getValue());
        return isNaN(val)
          ? <span className="text-base-content/40">—</span>
          : <span className="font-semibold">{val.toLocaleString('fr-FR')} DA</span>;
      },
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: (info) => statutBadge(info.getValue()),
    },
    {
      accessorKey: 'cree_le',
      header: 'Enregistré le',
      cell: (info) => {
        const d = info.getValue();
        if (!d) return '—';
        return <span className="text-xs text-base-content/70">{new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          <Link href={`/actifs/${info.row.original.id}`} className="btn btn-ghost btn-xs rounded-lg text-base-content/60 hover:bg-base-200" title="Fiche actif & maintenance">
            <Eye className="w-3.5 h-3.5" />
          </Link>
          {canDelete && <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-rose-500 hover:bg-rose-500/10" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200/50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Parc d'Actifs
            </h1>
            <p className="text-sm text-base-content/60 mt-1">{list.isFetching ? 'Chargement...' : `${list.total} actif(s) dans le parc.`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={list.isFetching} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${list.isFetching ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => { setFormError(null); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Ajouter un actif
              </button>
            )}
          </div>
        </div>

        {list.isError ? (
          <div className="alert alert-error shadow-lg rounded-2xl border border-rose-500/25 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-rose-800">Erreur</h3><p className="text-sm text-rose-700/80 mt-1">{list.error?.message}</p>
              <button onClick={() => list.refetch()} className="btn btn-sm btn-outline border-rose-500/30 text-rose-800 font-semibold rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : (
          <DataTableServer
            columns={columns}
            data={actifs}
            total={list.total}
            pageCount={list.pageCount}
            pagination={list.pagination}
            onPaginationChange={list.setPagination}
            search={list.search}
            onSearchChange={list.onSearchChange}
            loading={list.isFetching}
            searchPlaceholder="Rechercher par n° série, produit, statut..."
            toolbar={<ExportButtons filename="actifs" title="Parc d'Actifs" columns={exportColumns} fetchRows={list.fetchAll} formats={['excel']} />}
          />
        )}
      </div>
      {showCreateModal && (
        <ResourceModal
          title="Ajouter un actif"
          icon={Layers}
          fields={[
            { name: 'produit_id', label: 'Produit', type: 'select', required: true, placeholder: 'Sélectionner un produit', options: produits.map(p => ({ value: p.id, label: `${p.libelle}${p.sku ? ` - ${p.sku}` : ''}` })) },
            { name: 'numero_serie', label: 'Numéro de série', required: true, placeholder: 'SN-2026-001' },
            { name: 'entrepot_id', label: 'Entrepôt', type: 'select', required: true, placeholder: 'Sélectionner un entrepôt', options: entrepots.map(e => ({ value: e.id, label: e.nom })) },
            { name: 'emplacement', label: 'Emplacement', placeholder: 'Rayon A3' },
            { name: 'prix_unitaire', label: 'Prix unitaire / coût d’acquisition (DA)', type: 'number', min: 0, step: '0.01', placeholder: '0.00' },
            { name: 'statut', label: 'Statut', type: 'select', options: [
              { value: 'en_stock', label: 'En stock' },
              { value: 'affecte', label: 'Affecté' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'rebut', label: 'Rebut' },
            ] },
          ]}
          values={formData}
          error={formError}
          loading={formLoading}
          submitLabel="Créer"
          onChange={setFormData}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
