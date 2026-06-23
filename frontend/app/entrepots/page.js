'use client';

import React, { useState } from 'react';
import DataTableServer from '../../components/DataTableServer';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import ResourceModal from '../../components/ResourceModal';
import usePermissions from '../../hooks/usePermissions';
import {
  Building2, RefreshCw, AlertCircle, Plus, Pencil, Trash2,
  MapPin, CheckCircle2, XCircle
} from 'lucide-react';

/**
 * @component PageEntrepots
 * @description Page de gestion des entrepôts / sites de stockage avec RBAC.
 */
export default function PageEntrepots() {
  // ?page/?limit présents → l'API renvoie l'enveloppe paginée (sinon tableau brut pour les dropdowns)
  const list = usePaginatedResource('entrepots', 'entrepots', { pageSize: 10 });
  const entrepots = list.rows;
  const loading = list.isFetching;
  const firstLoad = loading && !list.data;
  const error = list.isError ? (list.error?.message || 'Erreur de chargement.') : null;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ nom: '', adresse: '', est_actif: true });

  // ── Édition ─────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ nom: '', adresse: '', est_actif: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const { canAccess } = usePermissions();

  const canCreate = canAccess('entrepots', 'create');
  const canUpdate = canAccess('entrepots', 'update');
  const canDelete = canAccess('entrepots', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de cet entrepôt ?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/entrepots/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      list.refetch();
    } catch (err) { alert(err.message); }
  };

  const openEdit = (ent) => {
    setEditError(null);
    setEditData({ nom: ent.nom || '', adresse: ent.adresse || '', est_actif: Boolean(ent.est_actif) });
    setEditing(ent);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/entrepots/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: editData.nom,
          adresse: editData.adresse || null,
          est_actif: Boolean(editData.est_actif),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la mise à jour de l’entrepôt');
      setEditing(null);
      list.refetch();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/entrepots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: formData.nom,
          adresse: formData.adresse || null,
          est_actif: Boolean(formData.est_actif),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création de l’entrepôt');
      setShowCreateModal(false);
      setFormData({ nom: '', adresse: '', est_actif: true });
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const stats = list.data?.stats || {};
  const totalSites = stats.total ?? 0;
  const actifs = stats.actifs ?? 0;
  const inactifs = stats.inactifs ?? 0;

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'nom',
      header: 'Nom',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary"><Building2 className="w-4 h-4" /></div>
          <span className="font-bold text-base-content/90">{info.getValue()}</span>
        </div>
      ),
    },
    {
      accessorKey: 'adresse',
      header: 'Adresse',
      cell: (info) => {
        const addr = info.getValue();
        if (!addr) return <span className="text-base-content/40">—</span>;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-base-content/70">
            <MapPin className="w-3.5 h-3.5 text-base-content/40 shrink-0" /> {addr}
          </span>
        );
      },
    },
    {
      accessorKey: 'est_actif',
      header: 'Statut',
      cell: (info) => info.getValue() ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Actif
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-error border border-rose-500/20">
          <XCircle className="w-3 h-3" /> Inactif
        </span>
      ),
    },
    {
      accessorKey: 'cree_le',
      header: 'Créé le',
      cell: (info) => {
        const d = info.getValue();
        if (!d) return '—';
        return <span className="text-xs text-base-content/70">{new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
      },
    },
    ...(canUpdate || canDelete ? [{
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          {canUpdate && <button onClick={() => openEdit(info.row.original)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-primary hover:bg-base-200" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>}
          {canDelete && <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              Gestion des Entrepôts
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Sites de stockage et emplacements physiques.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => { setFormError(null); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Nouvel entrepôt
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Building2 className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Sites</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : totalSites}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><CheckCircle2 className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Actifs</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : actifs}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><XCircle className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Inactifs</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : inactifs}</h3></div>
          </div>
        </div>

        <div className="mt-8">
          {firstLoad ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des entrepôts...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" /><div><h3 className="font-bold text-error">Erreur</h3><p className="text-sm text-base-content/70 mt-1">{error}</p>
                <button onClick={() => list.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button></div>
            </div>
          ) : (
            <DataTableServer
              columns={columns}
              data={entrepots}
              total={list.total}
              pageCount={list.pageCount}
              pagination={list.pagination}
              onPaginationChange={list.setPagination}
              search={list.search}
              onSearchChange={list.onSearchChange}
              loading={loading}
              searchPlaceholder="Rechercher par nom, adresse..."
            />
          )}
        </div>
      </div>
      {showCreateModal && (
        <ResourceModal
          title="Nouvel entrepôt"
          icon={Building2}
          fields={[
            { name: 'nom', label: 'Nom', required: true, placeholder: 'Dépôt central' },
            { name: 'adresse', label: 'Adresse', placeholder: 'Zone industrielle, Alger' },
            { name: 'est_actif', label: 'Statut', type: 'checkbox', help: 'Entrepôt actif' },
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

      {/* ── Modale d'édition ─────────────────────────────────────────── */}
      {editing && (
        <ResourceModal
          title={`Modifier « ${editing.nom} »`}
          icon={Pencil}
          fields={[
            { name: 'nom', label: 'Nom', required: true, placeholder: 'Dépôt central' },
            { name: 'adresse', label: 'Adresse', placeholder: 'Zone industrielle, Alger' },
            { name: 'est_actif', label: 'Statut', type: 'checkbox', help: 'Entrepôt actif' },
          ]}
          values={editData}
          error={editError}
          loading={editLoading}
          submitLabel="Enregistrer"
          onChange={setEditData}
          onClose={() => setEditing(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
