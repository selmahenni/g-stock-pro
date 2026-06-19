'use client';

import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import ResourceModal from '../../components/ResourceModal';
import usePermissions from '../../hooks/usePermissions';
import { genererBonDeSortie } from '../../lib/pdfDocuments';
import {
  Truck, RefreshCw, AlertCircle, Plus, Pencil, Trash2,
  ArrowDownCircle, ArrowUpCircle, FileText, FileDown
} from 'lucide-react';

/**
 * @component PageMouvements
 * @description Page d'historique des mouvements d'entrée/sortie avec RBAC.
 */
export default function PageMouvements() {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actifs, setActifs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    produit_id: '',      // filtre uniquement (non envoyé) : restreint la liste d'actifs
    actif_id: '',
    type_mouvement: 'entree',
    notes: '',
  });
  const { canAccess } = usePermissions();

  useEffect(() => {
    async function fetchMouvements() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://localhost:5000/api/mouvements?limit=200', {
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return; }
          throw new Error(`Erreur serveur (${res.status})`);
        }
        const data = await res.json();
        setMouvements(data.mouvements || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMouvements();
  }, [refreshKey]);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [actifsRes, produitsRes] = await Promise.all([
          fetch('http://localhost:5000/api/actifs?limit=500', { credentials: 'include' }),
          fetch('http://localhost:5000/api/produits?limit=500', { credentials: 'include' }),
        ]);
        if (actifsRes.ok) {
          const data = await actifsRes.json();
          setActifs(data.actifs || []);
        }
        if (produitsRes.ok) {
          const data = await produitsRes.json();
          setProduits(data.produits || []);
        }
      } catch {}
    }
    fetchOptions();
  }, []);

  // Réinitialise l'actif sélectionné si le filtre produit ou le type de mouvement change
  const handleFormChange = (next) => {
    if (next.produit_id !== formData.produit_id || next.type_mouvement !== formData.type_mouvement) {
      next = { ...next, actif_id: '' };
    }
    setFormData(next);
  };

  // Actifs « disponibles » selon le type de mouvement et le filtre produit :
  //  - sortie : uniquement les actifs en stock,
  //  - entrée : uniquement les actifs hors stock (retour en stock).
  const actifsDisponibles = actifs.filter((a) => {
    if (formData.produit_id && String(a.produit_id) !== String(formData.produit_id)) return false;
    if (formData.type_mouvement === 'sortie') return a.statut === 'en_stock';
    if (formData.type_mouvement === 'entree') return a.statut !== 'en_stock';
    return true;
  });

  const canCreate = canAccess('mouvements', 'create');
  const canUpdate = canAccess('mouvements', 'update');
  const canDelete = canAccess('mouvements', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de ce mouvement ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/mouvements/${id}`, {
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
      // L'entrepôt est déduit côté backend à partir de l'actif (plus de saisie ici).
      const res = await fetch('http://localhost:5000/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actif_id: Number(formData.actif_id),
          type_mouvement: formData.type_mouvement,
          notes: formData.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création du mouvement');
      setShowCreateModal(false);
      setFormData({ produit_id: '', actif_id: '', type_mouvement: 'entree', notes: '' });
      setRefreshKey(p => p + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const total = mouvements.length;
  const entrees = mouvements.filter(m => m.type_mouvement === 'entree').length;
  const sorties = mouvements.filter(m => m.type_mouvement === 'sortie').length;

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'type_mouvement',
      header: 'Type',
      cell: (info) => {
        const val = info.getValue();
        if (val === 'entree') return (
          <span className="inline-flex items-center gap-1.5 badge badge-sm py-2 px-2.5 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <ArrowDownCircle className="w-3 h-3" /> Entrée
          </span>
        );
        return (
          <span className="inline-flex items-center gap-1.5 badge badge-sm py-2 px-2.5 rounded-lg font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <ArrowUpCircle className="w-3 h-3" /> Sortie
          </span>
        );
      },
    },
    {
      accessorKey: 'numero_serie',
      header: 'N° Série Actif',
      cell: (info) => <span className="font-mono text-sm font-semibold">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'effectue_par_nom',
      header: 'Effectué par',
      cell: (info) => <span className="font-medium">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: (info) => {
        const notes = info.getValue();
        if (!notes) return <span className="text-base-content/40">—</span>;
        return <span className="text-xs text-base-content/70 line-clamp-2 max-w-[200px]">{notes}</span>;
      },
    },
    {
      accessorKey: 'cree_le',
      header: 'Date',
      cell: (info) => {
        const d = info.getValue();
        if (!d) return '—';
        return <span className="text-xs text-base-content/70">{new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const m = info.row.original;
        const estSortie = m.type_mouvement === 'sortie';
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => genererBonDeSortie(m)}
              className="btn btn-ghost btn-xs rounded-lg text-rose-500 hover:bg-rose-500/10 gap-1"
              title={estSortie ? 'Générer le bon de sortie (PDF)' : "Générer le bon d'entrée (PDF)"}
            >
              <FileDown className="w-3.5 h-3.5" /> {estSortie ? 'Bon de sortie' : "Bon d'entrée"}
            </button>
            {canUpdate && <button className="btn btn-ghost btn-xs rounded-lg text-sky-500 hover:bg-sky-500/10"><Pencil className="w-3.5 h-3.5" /></button>}
            {canDelete && <button onClick={() => handleDelete(m.id)} className="btn btn-ghost btn-xs rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200/50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Historique des Mouvements
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Traçabilité complète des entrées et sorties de stock.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRefreshKey(p => p + 1)} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => { setFormError(null); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Nouveau mouvement
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><FileText className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Mouvements</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : total}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><ArrowDownCircle className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Entrées</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : entrees}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><ArrowUpCircle className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Sorties</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : sorties}</h3></div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement de l'historique...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error shadow-lg rounded-2xl border border-rose-500/25 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5 shrink-0" />
              <div><h3 className="font-bold text-rose-800">Erreur</h3><p className="text-sm text-rose-700/80 mt-1">{error}</p>
                <button onClick={() => setRefreshKey(p => p + 1)} className="btn btn-sm btn-outline border-rose-500/30 text-rose-800 font-semibold rounded-lg mt-4">Réessayer</button>
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={mouvements} searchPlaceholder="Rechercher par n° série, auteur..." />
          )}
        </div>
      </div>
      {showCreateModal && (
        <ResourceModal
          title="Nouveau mouvement"
          icon={Truck}
          fields={[
            { name: 'type_mouvement', label: 'Type de mouvement', type: 'select', options: [
              { value: 'entree', label: 'Entrée (retour en stock)' },
              { value: 'sortie', label: 'Sortie (du stock)' },
            ] },
            {
              name: 'produit_id', label: 'Produit (filtre)', type: 'select', placeholder: 'Tous les produits',
              options: produits.map(p => ({ value: p.id, label: `${p.libelle}${p.sku ? ` - ${p.sku}` : ''}` })),
            },
            {
              name: 'actif_id', label: 'Actif disponible', type: 'select', required: true,
              placeholder: actifsDisponibles.length ? 'Sélectionner un actif' : 'Aucun actif disponible',
              options: actifsDisponibles.map(a => ({
                value: a.id,
                label: `${a.numero_serie}${a.produit_libelle ? ` - ${a.produit_libelle}` : ''}${a.entrepot_nom ? ` · ${a.entrepot_nom}` : ''}`,
              })),
            },
            { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Motif, référence ou observation' },
          ]}
          values={formData}
          error={formError}
          loading={formLoading}
          submitLabel="Créer"
          onChange={handleFormChange}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
