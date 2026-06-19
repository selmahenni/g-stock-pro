'use client';

import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
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
  const [entrepots, setEntrepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ nom: '', adresse: '', est_actif: true });
  const { canAccess } = usePermissions();

  useEffect(() => {
    async function fetchEntrepots() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://localhost:5000/api/entrepots', {
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const data = await res.json();
        // L'API entrepots renvoie directement un tableau
        setEntrepots(Array.isArray(data) ? data : (data.entrepots || []));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchEntrepots();
  }, [refreshKey]);

  const canCreate = canAccess('entrepots', 'create');
  const canUpdate = canAccess('entrepots', 'update');
  const canDelete = canAccess('entrepots', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de cet entrepôt ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/entrepots/${id}`, {
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
      const res = await fetch('http://localhost:5000/api/entrepots', {
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
      setRefreshKey(p => p + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const actifs = entrepots.filter(e => e.est_actif).length;
  const inactifs = entrepots.filter(e => !e.est_actif).length;

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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
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
              Gestion des Entrepôts
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Sites de stockage et emplacements physiques.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRefreshKey(p => p + 1)} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
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
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Sites</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : entrepots.length}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><CheckCircle2 className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Actifs</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : actifs}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><XCircle className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Inactifs</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : inactifs}</h3></div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des entrepôts...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error shadow-lg rounded-2xl border border-rose-500/25 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5 shrink-0" /><div><h3 className="font-bold text-rose-800">Erreur</h3><p className="text-sm text-rose-700/80 mt-1">{error}</p>
                <button onClick={() => setRefreshKey(p => p + 1)} className="btn btn-sm btn-outline border-rose-500/30 text-rose-800 font-semibold rounded-lg mt-4">Réessayer</button></div>
            </div>
          ) : (
            <DataTable columns={columns} data={entrepots} searchPlaceholder="Rechercher par nom, adresse..." />
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
    </div>
  );
}
