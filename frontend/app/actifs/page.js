'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DataTableServer from '../../components/DataTableServer';
import ExportButtons from '../../components/ExportButtons';
import FilterSelect from '../../components/FilterSelect';
import ResourceModal from '../../components/ResourceModal';
import StatusBadge from '../../components/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import {
  Layers, RefreshCw, AlertCircle, Plus, Pencil, Trash2,
  Monitor, CheckCircle2, XCircle, Clock, Eye, Wrench, Boxes, QrCode
} from 'lucide-react';

// Scanner caméra : chargé uniquement côté client (pas de SSR).
const QrScanner = dynamic(() => import('../../components/QrScanner'), { ssr: false });

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
  const [showScanner, setShowScanner] = useState(false);
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

  // ── Mode Batch ──────────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [batchType, setBatchType] = useState('manual'); // 'manual' | 'auto'
  const [batchSerials, setBatchSerials] = useState('');
  const [batchQuantity, setBatchQuantity] = useState('');
  const [batchResult, setBatchResult] = useState(null);

  // ── Édition ─────────────────────────────────────────────────────────
  const [editingActif, setEditingActif] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState(null);

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

  // ── Scan QR / code-barres ───────────────────────────────────────────
  // Le code lu (n° de série) pré-remplit le formulaire d'ajout en mode unitaire.
  // L'enregistrement crée l'actif → incrémente le stock → la ligne d'inventaire apparaît/maj.
  const handleScanResult = (text) => {
    setShowScanner(false);
    setBatchMode(false);
    setBatchResult(null);
    setFormError(null);
    setFormData((prev) => ({ ...prev, numero_serie: text }));
    setShowCreateModal(true);
  };

  // ── Création (unitaire) ─────────────────────────────────────────────
  const handleCreateSingle = async (e) => {
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
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création de l\'actif');
      setShowCreateModal(false);
      setFormData({ produit_id: '', numero_serie: '', entrepot_id: '', emplacement: '', prix_unitaire: '', statut: 'en_stock' });
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Création (batch) ────────────────────────────────────────────────
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setBatchResult(null);
    try {
      let numeros_serie;
      if (batchType === 'manual') {
        numeros_serie = batchSerials.split('\n').map(s => s.trim()).filter(Boolean);
        if (numeros_serie.length === 0) throw new Error('Saisissez au moins un numéro de série.');
      } else {
        const qty = parseInt(batchQuantity);
        if (!qty || qty < 1 || qty > 500) throw new Error('La quantité doit être entre 1 et 500.');
        const prefix = `AUTO-${Date.now()}-`;
        numeros_serie = Array.from({ length: qty }, (_, i) => `${prefix}${String(i + 1).padStart(3, '0')}`);
      }

      const res = await fetch('http://localhost:5000/api/actifs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          produit_id: Number(formData.produit_id),
          entrepot_id: Number(formData.entrepot_id),
          emplacement: formData.emplacement || null,
          prix_unitaire: formData.prix_unitaire ? Number(formData.prix_unitaire) : null,
          statut: formData.statut,
          numeros_serie,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création du lot');

      setBatchResult(data);
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreate = batchMode ? handleCreateBatch : handleCreateSingle;

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setBatchMode(false);
    setBatchType('manual');
    setBatchSerials('');
    setBatchQuantity('');
    setBatchResult(null);
    setFormError(null);
    setFormData({ produit_id: '', numero_serie: '', entrepot_id: '', emplacement: '', prix_unitaire: '', statut: 'en_stock' });
  };

  // ── Édition ─────────────────────────────────────────────────────────
  const openEditModal = (actif) => {
    setEditFormError(null);
    setEditFormData({
      produit_id: actif.produit_id || '',
      numero_serie: actif.numero_serie || '',
      entrepot_id: actif.entrepot_id || '',
      emplacement: actif.emplacement || '',
      prix_unitaire: actif.prix_unitaire != null ? actif.prix_unitaire : '',
      statut: actif.statut || 'en_stock',
    });
    setEditingActif(actif);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/actifs/${editingActif.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          produit_id: Number(editFormData.produit_id),
          numero_serie: editFormData.numero_serie,
          entrepot_id: Number(editFormData.entrepot_id),
          emplacement: editFormData.emplacement || null,
          prix_unitaire: editFormData.prix_unitaire ? Number(editFormData.prix_unitaire) : null,
          statut: editFormData.statut,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la modification');
      setEditingActif(null);
      list.refetch();
    } catch (err) {
      setEditFormError(err.message);
    } finally {
      setEditFormLoading(false);
    }
  };

  // ── Colonnes d'export (valeurs brutes) ─────────────────────────────
  const exportColumns = [
    { header: 'ID', accessor: 'id' },
    { header: 'N° Série', accessor: 'numero_serie' },
    { header: 'Produit', accessor: 'produit_libelle' },
    { header: 'Entrepôt', accessor: 'entrepot_nom' },
    { header: 'Emplacement', accessor: 'emplacement' },
    { header: 'Prix (DA)', accessor: 'prix_unitaire' },
    { header: 'Statut', accessor: 'statut' },
  ];

  // Badge de statut unifié (composant partagé StatusBadge)
  const statutBadge = (statut) => <StatusBadge status={statut} />;

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
      meta: { align: 'right' },
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
          {canUpdate && <button onClick={() => openEditModal(info.row.original)} className="btn btn-ghost btn-xs rounded-lg text-amber-500 hover:bg-amber-500/10" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>}
          {canDelete && <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ),
    },
  ];

  // ── Champs partagés entre création et édition ──────────────────────
  const commonFields = [
    { name: 'produit_id', label: 'Produit', type: 'select', required: true, placeholder: 'Sélectionner un produit', options: produits.map(p => ({ value: p.id, label: `${p.libelle}${p.sku ? ` - ${p.sku}` : ''}` })) },
    { name: 'entrepot_id', label: 'Entrepôt', type: 'select', required: true, placeholder: 'Sélectionner un entrepôt', options: entrepots.map(e => ({ value: e.id, label: e.nom })) },
    { name: 'emplacement', label: 'Emplacement', placeholder: 'Rayon A3' },
    { name: 'prix_unitaire', label: 'Prix unitaire / coût d\'acquisition (DA)', type: 'number', min: 0, step: '0.01', placeholder: '0.00' },
    { name: 'statut', label: 'Statut', type: 'select', options: [
      { value: 'en_stock', label: 'En stock' },
      { value: 'affecte', label: 'Affecté' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'rebut', label: 'Rebut' },
    ] },
  ];

  const createFieldsSingle = [
    commonFields[0], // produit_id
    { name: 'numero_serie', label: 'Numéro de série', required: true, placeholder: 'SN-2026-001' },
    ...commonFields.slice(1),
  ];

  const editFields = [
    commonFields[0], // produit_id
    { name: 'numero_serie', label: 'Numéro de série', required: true, placeholder: 'SN-2026-001' },
    ...commonFields.slice(1),
  ];

  // Sélecteur de mode (un actif / lot), affiché en haut des deux modales
  const modeToggle = !batchResult ? (
    <div className="flex gap-1 mb-5 p-1 bg-base-200/60 rounded-xl">
      <button type="button" onClick={() => setBatchMode(false)} className={`btn btn-sm rounded-lg flex-1 gap-2 ${!batchMode ? 'btn-primary' : 'btn-ghost'}`}>
        <Layers className="w-4 h-4" /> Un actif
      </button>
      <button type="button" onClick={() => setBatchMode(true)} className={`btn btn-sm rounded-lg flex-1 gap-2 ${batchMode ? 'btn-primary' : 'btn-ghost'}`}>
        <Boxes className="w-4 h-4" /> Plusieurs (lot)
      </button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              Parc d'Actifs
            </h1>
            <p className="text-sm text-base-content/60 mt-1">{list.isFetching ? 'Chargement...' : `${list.total} actif(s) dans le parc.`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={list.isFetching} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${list.isFetching ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => setShowScanner(true)} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all" title="Scanner un QR / code‑barres">
                <QrCode className="w-4 h-4" /> Scanner
              </button>
            )}
            {canCreate && (
              <button onClick={() => { setFormError(null); setBatchResult(null); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Ajouter des actifs
              </button>
            )}
          </div>
        </div>

        {list.isError ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur</h3><p className="text-sm text-base-content/70 mt-1">{list.error?.message}</p>
              <button onClick={() => list.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
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
            toolbar={
              <div className="flex items-center gap-2 flex-wrap">
                <FilterSelect
                  value={list.filters.statut}
                  onChange={(v) => list.setFilters({ ...list.filters, statut: v })}
                  options={[
                    { value: 'en_stock', label: 'En stock' },
                    { value: 'affecte', label: 'Affecté' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'rebut', label: 'Rebut' },
                  ]}
                  allLabel="Tous les statuts"
                  title="Filtrer par statut"
                />
                <FilterSelect
                  value={list.filters.produit_id}
                  onChange={(v) => list.setFilters({ ...list.filters, produit_id: v })}
                  options={produits.map(p => ({ value: p.id, label: `${p.libelle}${p.sku ? ` (${p.sku})` : ''}` }))}
                  allLabel="Tous les produits"
                  title="Filtrer par produit"
                />
                <ExportButtons filename="actifs" title="Parc d'Actifs" columns={exportColumns} fetchRows={list.fetchAll} formats={['excel']} />
              </div>
            }
          />
        )}
      </div>

      {/* ── Scanner QR / code-barres ───────────────────────────────────── */}
      {showScanner && (
        <QrScanner
          title="Scanner un actif"
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Modale de création (unitaire ou batch) ──────────────────────── */}
      {showCreateModal && !batchMode && (
        <ResourceModal
          title="Ajouter un actif"
          icon={Layers}
          fields={createFieldsSingle}
          values={formData}
          error={formError}
          loading={formLoading}
          submitLabel="Créer"
          onChange={setFormData}
          onClose={resetCreateModal}
          onSubmit={handleCreateSingle}
          headerExtra={modeToggle}
        />
      )}

      {/* Modale batch : on la construit manuellement pour inclure le toggle et le textarea/quantité */}
      {showCreateModal && batchMode && (
        <div className="modal modal-open">
          <div className="modal-box relative bg-base-100 rounded-xl shadow-xl border border-base-200 max-w-lg">
            <button onClick={resetCreateModal} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">✕</button>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Boxes className="w-5 h-5 text-primary" /> Ajouter plusieurs actifs (lot)
            </h3>

            {modeToggle}

            {formError && (
              <div className="alert alert-error rounded-xl mb-4 py-2 text-sm">
                <AlertCircle className="w-4 h-4" /><span>{formError}</span>
              </div>
            )}

            {batchResult ? (
              <div className="space-y-4">
                <div className="alert alert-success rounded-xl py-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-bold">{batchResult.nombre} actif(s) créé(s) avec succès !</p>
                    <p className="text-sm mt-1">Valeur totale du lot : <span className="font-bold">{batchResult.valeur_totale?.toLocaleString('fr-FR')} DA</span></p>
                  </div>
                </div>
                <div className="modal-action">
                  <button onClick={resetCreateModal} className="btn btn-primary rounded-xl">Fermer</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBatch} className="space-y-4">
                {/* Produit */}
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Produit</span></label>
                  <select required className="select select-bordered rounded-xl w-full" value={formData.produit_id} onChange={(e) => setFormData({ ...formData, produit_id: e.target.value })}>
                    <option value="">Sélectionner un produit</option>
                    {produits.map(p => <option key={p.id} value={p.id}>{p.libelle}{p.sku ? ` - ${p.sku}` : ''}</option>)}
                  </select>
                </div>
                {/* Entrepôt */}
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Entrepôt</span></label>
                  <select required className="select select-bordered rounded-xl w-full" value={formData.entrepot_id} onChange={(e) => setFormData({ ...formData, entrepot_id: e.target.value })}>
                    <option value="">Sélectionner un entrepôt</option>
                    {entrepots.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                {/* Emplacement */}
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Emplacement</span></label>
                  <input type="text" placeholder="Rayon A3" className="input input-bordered rounded-xl w-full" value={formData.emplacement} onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })} />
                </div>
                {/* Prix unitaire */}
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Prix unitaire (DA)</span></label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" className="input input-bordered rounded-xl w-full" value={formData.prix_unitaire} onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })} />
                </div>
                {/* Statut */}
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Statut</span></label>
                  <select className="select select-bordered rounded-xl w-full" value={formData.statut} onChange={(e) => setFormData({ ...formData, statut: e.target.value })}>
                    <option value="en_stock">En stock</option>
                    <option value="affecte">Affecté</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="rebut">Rebut</option>
                  </select>
                </div>

                {/* Toggle type batch */}
                <div className="divider text-xs text-base-content/50 font-semibold uppercase">Numéros de série</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setBatchType('manual')} className={`btn btn-sm rounded-xl flex-1 ${batchType === 'manual' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                    Saisie manuelle
                  </button>
                  <button type="button" onClick={() => setBatchType('auto')} className={`btn btn-sm rounded-xl flex-1 ${batchType === 'auto' ? 'btn-primary' : 'btn-ghost border border-base-300'}`}>
                    Génération auto
                  </button>
                </div>

                {batchType === 'manual' ? (
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Numéros de série (un par ligne)</span></label>
                    <textarea
                      required
                      className="textarea textarea-bordered rounded-xl w-full min-h-28 font-mono text-sm"
                      placeholder={"SN-2026-001\nSN-2026-002\nSN-2026-003"}
                      value={batchSerials}
                      onChange={(e) => setBatchSerials(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        {batchSerials.split('\n').filter(s => s.trim()).length} numéro(s) détecté(s)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label"><span className="label-text font-semibold">Quantité d'actifs à générer</span></label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="500"
                      placeholder="Nombre d'actifs (ex : 10)"
                      className="input input-bordered rounded-xl w-full"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(e.target.value)}
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        Les N° série seront générés automatiquement (AUTO-timestamp-001, 002...)
                      </span>
                    </label>
                  </div>
                )}

                {/* Aperçu de la valeur totale du lot (live) */}
                {(() => {
                  const count = batchType === 'manual'
                    ? batchSerials.split('\n').filter(s => s.trim()).length
                    : (parseInt(batchQuantity) || 0);
                  const pu = Number(formData.prix_unitaire) || 0;
                  return (
                    <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mt-2">
                      <div className="text-sm">
                        <span className="font-semibold text-base-content/80">{count}</span>
                        <span className="text-base-content/50"> actif(s) × </span>
                        <span className="font-semibold text-base-content/80">{pu.toLocaleString('fr-FR')} DA</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-base-content/50 font-semibold uppercase">Valeur totale du lot</p>
                        <p className="text-lg font-bold text-primary">{(count * pu).toLocaleString('fr-FR')} DA</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="modal-action">
                  <button type="button" onClick={resetCreateModal} className="btn btn-ghost rounded-xl">Annuler</button>
                  <button type="submit" disabled={formLoading} className="btn btn-primary rounded-xl gap-2">
                    {formLoading && <span className="loading loading-spinner loading-sm"></span>}
                    Créer le lot
                  </button>
                </div>
              </form>
            )}
          </div>
          <div className="modal-backdrop" onClick={resetCreateModal}></div>
        </div>
      )}

      {/* ── Modale d'édition ────────────────────────────────────────────── */}
      {editingActif && (
        <ResourceModal
          title={`Modifier l'actif #${editingActif.id}`}
          icon={Pencil}
          fields={editFields}
          values={editFormData}
          error={editFormError}
          loading={editFormLoading}
          submitLabel="Enregistrer"
          onChange={setEditFormData}
          onClose={() => setEditingActif(null)}
          onSubmit={handleEdit}
        />
      )}
    </div>
  );
}
