'use client';

import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import ResourceModal from '../../components/ResourceModal';
import usePermissions from '../../hooks/usePermissions';
import { Tag, RefreshCw, AlertCircle, Plus, Pencil, Trash2, FileText } from 'lucide-react';

/**
 * @component PageCategories
 * @description Page de gestion des catégories de produits avec RBAC.
 */
export default function PageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const { canAccess } = usePermissions();

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://localhost:5000/api/categories?limit=200', {
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, [refreshKey]);

  const canCreate = canAccess('categories', 'create');
  const canUpdate = canAccess('categories', 'update');
  const canDelete = canAccess('categories', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de cette catégorie ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/categories/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setRefreshKey(p => p + 1);
    } catch (err) { alert(err.message); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nom: formData.nom, description: formData.description || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création de la catégorie');
      setShowCreateModal(false);
      setFormData({ nom: '', description: '' });
      setRefreshKey(p => p + 1);
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
      header: 'Nom',
      cell: (info) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary"><Tag className="w-4 h-4" /></div>
          <span className="font-bold text-base-content/90">{info.getValue()}</span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => <span className="text-sm text-base-content/70 line-clamp-2 max-w-[300px]">{info.getValue() || '—'}</span>,
    },
    ...(canUpdate || canDelete ? [{
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          {canUpdate && <button className="btn btn-ghost btn-xs rounded-lg text-sky-500 hover:bg-sky-500/10"><Pencil className="w-3.5 h-3.5" /></button>}
          {canDelete && <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ),
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200/50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gestion des Catégories
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Organisez les produits du catalogue par catégorie.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRefreshKey(p => p + 1)} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => { setFormError(null); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Nouvelle catégorie
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Tag className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Catégories</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : categories.length}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><FileText className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Avec Description</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : categories.filter(c => c.description).length}</h3></div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des catégories...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error shadow-lg rounded-2xl border border-rose-500/25 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5 shrink-0" /><div><h3 className="font-bold text-rose-800">Erreur</h3><p className="text-sm text-rose-700/80 mt-1">{error}</p>
                <button onClick={() => setRefreshKey(p => p + 1)} className="btn btn-sm btn-outline border-rose-500/30 text-rose-800 font-semibold rounded-lg mt-4">Réessayer</button></div>
            </div>
          ) : (
            <DataTable columns={columns} data={categories} searchPlaceholder="Rechercher par nom..." />
          )}
        </div>
      </div>
      {showCreateModal && (
        <ResourceModal
          title="Nouvelle catégorie"
          icon={Tag}
          fields={[
            { name: 'nom', label: 'Nom', required: true, placeholder: 'Informatique' },
            { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Produits et équipements informatiques' },
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
