'use client';

import React, { useState } from 'react';
import DataTableServer from '../../components/DataTableServer';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import ResourceModal from '../../components/ResourceModal';
import usePermissions from '../../hooks/usePermissions';
import { Building2, RefreshCw, AlertCircle, Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';

/**
 * @component PageFournisseurs
 * @description Page de gestion des fournisseurs avec RBAC.
 */
export default function PageFournisseurs() {
  const list = usePaginatedResource('fournisseurs', 'fournisseurs', { pageSize: 10 });
  const fournisseurs = list.rows;
  const loading = list.isFetching;
  const firstLoad = loading && !list.data;
  const error = list.isError ? (list.error?.message || 'Erreur de chargement.') : null;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ nom: '', adresse_email: '', telephone: '' });

  // ── Édition ─────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({ nom: '', adresse_email: '', telephone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const { canAccess } = usePermissions();

  const canCreate = canAccess('fournisseurs', 'create');
  const canUpdate = canAccess('fournisseurs', 'update');
  const canDelete = canAccess('fournisseurs', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de ce fournisseur ?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fournisseurs/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      list.refetch();
    } catch (err) { alert(err.message); }
  };

  const openEdit = (f) => {
    setEditError(null);
    setEditData({ nom: f.nom || '', adresse_email: f.adresse_email || '', telephone: f.telephone || '' });
    setEditing(f);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fournisseurs/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: editData.nom,
          adresse_email: editData.adresse_email || null,
          telephone: editData.telephone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la mise à jour du fournisseur');
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
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom: formData.nom,
          adresse_email: formData.adresse_email || null,
          telephone: formData.telephone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création du fournisseur');
      setShowCreateModal(false);
      setFormData({ nom: '', adresse_email: '', telephone: '' });
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'nom',
      header: 'Fournisseur',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-secondary/10 text-secondary rounded-xl w-10 h-10 font-bold flex items-center justify-center">
              <span className="text-xs">{(info.getValue() || 'F').slice(0, 2).toUpperCase()}</span>
            </div>
          </div>
          <span className="font-bold text-base-content/90">{info.getValue()}</span>
        </div>
      ),
    },
    {
      accessorKey: 'adresse_email',
      header: 'Email',
      cell: (info) => {
        const email = info.getValue();
        if (!email) return <span className="text-base-content/40">—</span>;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-base-content/70">
            <Mail className="w-3.5 h-3.5 text-base-content/40" /> {email}
          </span>
        );
      },
    },
    {
      accessorKey: 'telephone',
      header: 'Téléphone',
      cell: (info) => {
        const tel = info.getValue();
        if (!tel) return <span className="text-base-content/40">—</span>;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-base-content/70">
            <Phone className="w-3.5 h-3.5 text-base-content/40" /> {tel}
          </span>
        );
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
              Gestion des Fournisseurs
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Annuaire des fournisseurs et partenaires commerciaux.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => { setFormError(null); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Ajouter un fournisseur
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Building2 className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Fournisseurs</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : (list.data?.stats?.total ?? 0)}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Mail className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Avec Email</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : (list.data?.stats?.avec_email ?? 0)}</h3></div>
          </div>
        </div>

        <div className="mt-8">
          {firstLoad ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des fournisseurs...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" /><div><h3 className="font-bold text-error">Erreur</h3><p className="text-sm text-base-content/70 mt-1">{error}</p>
                <button onClick={() => list.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button></div>
            </div>
          ) : (
            <DataTableServer
              columns={columns}
              data={fournisseurs}
              total={list.total}
              pageCount={list.pageCount}
              pagination={list.pagination}
              onPaginationChange={list.setPagination}
              search={list.search}
              onSearchChange={list.onSearchChange}
              loading={loading}
              searchPlaceholder="Rechercher par nom, email, téléphone..."
            />
          )}
        </div>
      </div>
      {showCreateModal && (
        <ResourceModal
          title="Ajouter un fournisseur"
          icon={Building2}
          fields={[
            { name: 'nom', label: 'Nom', required: true, placeholder: 'Fournisseur SARL' },
            { name: 'adresse_email', label: 'Email', type: 'email', placeholder: 'contact@fournisseur.dz' },
            { name: 'telephone', label: 'Téléphone', placeholder: '+213...' },
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
            { name: 'nom', label: 'Nom', required: true, placeholder: 'Fournisseur SARL' },
            { name: 'adresse_email', label: 'Email', type: 'email', placeholder: 'contact@fournisseur.dz' },
            { name: 'telephone', label: 'Téléphone', placeholder: '+213...' },
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
