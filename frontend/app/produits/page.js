'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DataTableServer from '../../components/DataTableServer';
import ExportButtons from '../../components/ExportButtons';
import AsyncSelect from '../../components/AsyncSelect';
import ResourceModal from '../../components/ResourceModal';
import usePermissions from '../../hooks/usePermissions';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import {
  Package, RefreshCw, AlertCircle, Plus, Pencil, Trash2, X,
  Image as ImageIcon, Eye, AlertTriangle, Wrench, Tag, Building2
} from 'lucide-react';

/**
 * @component PageProduits
 * @description Page de gestion du catalogue de produits avec RBAC.
 */
export default function PageProduits() {
  // Liste paginée côté serveur (TanStack Query)
  const list = usePaginatedResource('produits', 'produits', { pageSize: 10 });
  const produits = list.rows;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editId, setEditId] = useState(null); // null = création, sinon id du produit édité
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const emptyForm = {
    libelle: '',
    sku: '',
    categorie_id: '',
    fournisseur_id: '',
    image_url: '',
    stock_minimum: 0,
    stock_critique: 0,
    // Maintenance : 'aucune' | 'curative' (à la demande) | 'preventive' (planifiée)
    maintenance_type: 'aucune',
    intervalle_valeur: '',
    intervalle_unite: 'jour',
  };
  const [formData, setFormData] = useState(emptyForm);

  // Listes d'options pour les sélecteurs Catégorie / Fournisseur du formulaire
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  // Libellé de la catégorie sélectionnée dans le filtre (recherche serveur)
  const [categorieFilterLabel, setCategorieFilterLabel] = useState('');

  // Ajout rapide (modale secondaire) : 'categorie' | 'fournisseur' | null
  const [quickAdd, setQuickAdd] = useState(null);
  const [quickAddData, setQuickAddData] = useState({});
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState(null);

  const { canAccess } = usePermissions();

  // Chargement des options Catégorie / Fournisseur (sélecteurs du formulaire produit)
  const loadCategories = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categories?limit=500', { credentials: 'include' });
      if (res.ok) { const data = await res.json(); setCategories(data.categories || []); }
    } catch { /* ignore */ }
  };
  const loadFournisseurs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/fournisseurs?limit=500', { credentials: 'include' });
      if (res.ok) { const data = await res.json(); setFournisseurs(data.fournisseurs || []); }
    } catch { /* ignore */ }
  };

  // Les options Catégorie / Fournisseur ne sont chargées QU'À L'OUVERTURE du
  // formulaire produit (création ou édition) — pas au chargement de la page —
  // pour ne pas tirer ces listes complètes inutilement à l'affichage du catalogue.
  const [optionsChargees, setOptionsChargees] = useState(false);
  const chargerOptions = async () => {
    if (optionsChargees) return;
    await Promise.all([loadCategories(), loadFournisseurs()]);
    setOptionsChargees(true);
  };

  const canCreate = canAccess('produits', 'create');
  const canUpdate = canAccess('produits', 'update');
  const canDelete = canAccess('produits', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de ce produit ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/produits/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      list.refetch();
    } catch (err) { alert(err.message); }
  };

  // Ouvre la modale d'édition pré-remplie avec les données du produit
  const openEdit = (produit) => {
    setFormError(null);
    chargerOptions();
    // Valeur d'intervalle (nouveau format) avec repli sur l'ancien champ « jours »
    const valeur = produit.intervalle_valeur ?? produit.intervalle_maintenance_jours ?? '';
    // Dérivation : maintenable = préventive (avec intervalle) ; sinon non maintenable.
    const maintenance_type = produit.est_maintenable ? 'preventive' : 'aucune';
    setFormData({
      libelle: produit.libelle ?? '',
      sku: produit.sku ?? '',
      categorie_id: produit.categorie_id != null ? String(produit.categorie_id) : '',
      fournisseur_id: produit.fournisseur_id != null ? String(produit.fournisseur_id) : '',
      image_url: produit.image_url ?? '',
      stock_minimum: produit.stock_minimum ?? 0,
      stock_critique: produit.stock_critique ?? 0,
      maintenance_type,
      intervalle_valeur: valeur === null ? '' : String(valeur || ''),
      intervalle_unite: produit.intervalle_unite ?? 'jour',
    });
    setEditId(produit.id);
  };

  const closeProductModal = () => {
    setShowCreateModal(false);
    setEditId(null);
    setFormData(emptyForm);
  };

  // Si le type de maintenance n'est plus « préventive », on vide la valeur d'intervalle
  const handleProductChange = (next) => {
    if (next.maintenance_type !== 'preventive' && formData.maintenance_type === 'preventive') {
      next = { ...next, intervalle_valeur: '' };
    }
    setFormData(next);
  };

  // Téléverse une image vers le backend et renvoie son URL publique
  const uploadImage = async (file) => {
    const body = new FormData();
    body.append('image', file);
    const res = await fetch('http://localhost:5000/api/uploads/image', {
      method: 'POST',
      credentials: 'include',
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Échec du téléversement de l\'image');
    return data.url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      // Un produit maintenable DOIT avoir un intervalle + une unité.
      if (formData.maintenance_type === 'preventive' && (!formData.intervalle_valeur || !formData.intervalle_unite)) {
        throw new Error('Un produit maintenable doit avoir un intervalle de maintenance et une unité.');
      }
      const payload = {
        categorie_id: formData.categorie_id ? Number(formData.categorie_id) : null,
        fournisseur_id: formData.fournisseur_id ? Number(formData.fournisseur_id) : null,
        libelle: formData.libelle,
        sku: formData.sku || null,
        image_url: formData.image_url || null,
        stock_minimum: formData.stock_minimum ? Number(formData.stock_minimum) : 0,
        stock_critique: formData.stock_critique ? Number(formData.stock_critique) : 0,
        // Maintenable = maintenance préventive planifiée (avec intervalle obligatoire)
        est_maintenable: formData.maintenance_type === 'preventive',
        // L'intervalle n'a de sens que pour un produit maintenable
        intervalle_valeur: formData.maintenance_type === 'preventive' && formData.intervalle_valeur
          ? Number(formData.intervalle_valeur)
          : null,
        intervalle_unite: formData.maintenance_type === 'preventive'
          ? formData.intervalle_unite
          : null,
      };
      const isEdit = editId != null;
      const res = await fetch(`http://localhost:5000/api/produits${isEdit ? `/${editId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur lors de ${isEdit ? 'la modification' : 'la création'} du produit`);
      closeProductModal();
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Ajout rapide Catégorie / Fournisseur ───────────────────────────────
  const canCreateCategorie = canAccess('categories', 'create');
  const canCreateFournisseur = canAccess('fournisseurs', 'create');

  const quickAddConfig = {
    categorie: {
      title: 'Ajout rapide — Catégorie',
      icon: Tag,
      endpoint: 'http://localhost:5000/api/categories',
      initial: { nom: '', description: '' },
      fields: [
        { name: 'nom', label: 'Nom', required: true, placeholder: 'Informatique' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Produits et équipements informatiques' },
      ],
      buildPayload: (d) => ({ nom: d.nom, description: d.description || null }),
      reload: loadCategories,
      target: 'categorie_id',
    },
    fournisseur: {
      title: 'Ajout rapide — Fournisseur',
      icon: Building2,
      endpoint: 'http://localhost:5000/api/fournisseurs',
      initial: { nom: '', adresse_email: '', telephone: '' },
      fields: [
        { name: 'nom', label: 'Nom', required: true, placeholder: 'Fournisseur SARL' },
        { name: 'adresse_email', label: 'Email', type: 'email', placeholder: 'contact@fournisseur.dz' },
        { name: 'telephone', label: 'Téléphone', placeholder: '+213...' },
      ],
      buildPayload: (d) => ({ nom: d.nom, adresse_email: d.adresse_email || null, telephone: d.telephone || null }),
      reload: loadFournisseurs,
      target: 'fournisseur_id',
    },
  };

  const openQuickAdd = (type) => {
    setQuickAddError(null);
    setQuickAddData(quickAddConfig[type].initial);
    setQuickAdd(type);
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    const cfg = quickAddConfig[quickAdd];
    setQuickAddLoading(true);
    setQuickAddError(null);
    try {
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cfg.buildPayload(quickAddData)),
      });
      const created = await res.json();
      if (!res.ok) throw new Error(created.message || 'Erreur lors de la création');
      await cfg.reload();
      // Sélectionne automatiquement l'élément fraîchement créé dans le formulaire produit
      if (created?.id) {
        setFormData(prev => ({ ...prev, [cfg.target]: String(created.id) }));
      }
      setQuickAdd(null);
    } catch (err) {
      setQuickAddError(err.message);
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Colonnes d'export (valeurs brutes)
  const exportColumns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Libellé', accessor: 'libelle' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Catégorie', accessor: 'categorie_nom' },
    { header: 'Fournisseur', accessor: 'fournisseur_nom' },
    { header: 'Stock min.', accessor: 'stock_minimum' },
    { header: 'Seuil critique', accessor: 'stock_critique' },
    { header: 'Maintenance', accessor: (p) => p.est_maintenable ? (p.intervalle_valeur ? `Préventive (${p.intervalle_valeur} ${p.intervalle_unite})` : 'Curative') : 'Aucune' },
  ];

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'libelle',
      header: 'Produit',
      cell: (info) => {
        const p = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-base-200 border border-base-200 overflow-hidden shrink-0 flex items-center justify-center">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.libelle} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-4 h-4 text-base-content/30" />
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/produits/${p.id}`} className="font-bold text-base-content/90 hover:text-primary hover:underline transition-colors block truncate">
                {info.getValue()}
              </Link>
              <div className="text-xs text-base-content/50 font-mono">{p.sku || '—'}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'stock_minimum',
      header: 'Stock Min.',
      meta: { align: 'right' },
      cell: (info) => <span className="badge badge-ghost badge-sm">{info.getValue() ?? '—'}</span>,
    },
    {
      accessorKey: 'stock_critique',
      header: 'Seuil Critique',
      meta: { align: 'right' },
      cell: (info) => {
        const val = info.getValue();
        return val ? (
          <span className="badge badge-sm bg-amber-500/10 text-amber-600 border border-amber-500/20 font-semibold">{val}</span>
        ) : <span className="text-base-content/40">—</span>;
      },
    },
    {
      accessorKey: 'est_maintenable',
      header: 'Maintenance',
      cell: (info) => {
        const p = info.row.original;
        if (!p.est_maintenable) return <span className="text-xs text-base-content/40">Aucune</span>;
        const valeur = p.intervalle_valeur ?? p.intervalle_maintenance_jours;
        if (valeur) {
          const u = { minute: 'min', heure: 'h', jour: 'j', mois: 'mois', annee: 'an' }[p.intervalle_unite || 'jour'] || 'j';
          return <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600"><Wrench className="w-3 h-3" /> Préventive · {valeur} {u}</span>;
        }
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500"><Wrench className="w-3 h-3" /> Maintenable</span>;
      },
    },
    {
      accessorKey: 'cree_le',
      header: 'Ajouté le',
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
          <Link href={`/produits/${info.row.original.id}`} className="btn btn-ghost btn-xs rounded-lg text-base-content/60 hover:bg-base-200" title="Voir la fiche">
            <Eye className="w-3.5 h-3.5" />
          </Link>
          {canUpdate && (
            <button onClick={() => openEdit(info.row.original)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-primary hover:bg-base-200" title="Modifier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200" title="Supprimer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              Catalogue Produits
            </h1>
            <p className="text-sm text-base-content/60 mt-1">{list.isFetching ? 'Chargement...' : `${list.total} produit(s) au catalogue.`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={list.isFetching} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 transition-all hover:scale-105">
              <RefreshCw className={`w-4 h-4 ${list.isFetching ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={() => { setFormError(null); setEditId(null); setFormData(emptyForm); chargerOptions(); setShowCreateModal(true); }} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Ajouter un produit
              </button>
            )}
          </div>
        </div>

        {/* Data */}
        {list.isError ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur</h3>
              <p className="text-sm text-base-content/70 mt-1">{list.error?.message}</p>
              <button onClick={() => list.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : (
          <DataTableServer
            columns={columns}
            data={produits}
            total={list.total}
            pageCount={list.pageCount}
            pagination={list.pagination}
            onPaginationChange={list.setPagination}
            search={list.search}
            onSearchChange={list.onSearchChange}
            loading={list.isFetching}
            searchPlaceholder="Rechercher par libellé, SKU..."
            toolbar={
              <div className="flex items-center gap-2 flex-wrap">
                <AsyncSelect
                  value={list.filters.categorie_id}
                  selectedLabel={categorieFilterLabel}
                  onChange={(v, label) => { setCategorieFilterLabel(label); list.setFilters({ ...list.filters, categorie_id: v }); }}
                  fetchOptions={async (q) => {
                    const res = await fetch(`http://localhost:5000/api/categories?limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' });
                    if (!res.ok) return [];
                    const d = await res.json();
                    return (d.categories || []).map(c => ({ value: c.id, label: c.nom }));
                  }}
                  allLabel="Toutes les catégories"
                  placeholder="Rechercher une catégorie…"
                />
                <ExportButtons filename="produits" title="Catalogue Produits" columns={exportColumns} fetchRows={list.fetchAll} formats={['excel']} />
              </div>
            }
          />
        )}
      </div>
      {(showCreateModal || editId != null) && (
        <ResourceModal
          title={editId != null ? 'Modifier le produit' : 'Ajouter un produit'}
          icon={Package}
          fields={[
            { name: 'libelle', label: 'Libellé', required: true, placeholder: 'Ordinateur portable' },
            { name: 'sku', label: 'SKU', placeholder: 'LAP-001' },
            {
              name: 'categorie_id', label: 'Catégorie', type: 'select', placeholder: 'Sélectionner une catégorie',
              options: categories.map(c => ({ value: c.id, label: c.nom })),
              ...(canCreateCategorie ? { action: { icon: Plus, title: 'Ajouter une catégorie', onClick: () => openQuickAdd('categorie') } } : {}),
            },
            {
              name: 'fournisseur_id', label: 'Fournisseur', type: 'select', placeholder: 'Sélectionner un fournisseur',
              options: fournisseurs.map(f => ({ value: f.id, label: f.nom })),
              ...(canCreateFournisseur ? { action: { icon: Plus, title: 'Ajouter un fournisseur', onClick: () => openQuickAdd('fournisseur') } } : {}),
            },
            { name: 'image_url', label: 'Image — optionnel', type: 'image', upload: uploadImage, placeholder: 'ou coller une URL d\'image' },
            { name: 'stock_minimum', label: 'Stock minimum', type: 'number', min: 0 },
            { name: 'stock_critique', label: 'Seuil critique', type: 'number', min: 0 },
            {
              name: 'maintenance_type', label: 'Type de maintenance', type: 'select',
              options: [
                { value: 'aucune', label: 'Non maintenable' },
                { value: 'preventive', label: 'Maintenable (maintenance préventive planifiée)' },
              ],
            },
            {
              name: 'intervalle_valeur',
              label: 'Intervalle — valeur',
              type: 'number', min: 1,
              required: formData.maintenance_type === 'preventive',
              disabled: formData.maintenance_type !== 'preventive',
              placeholder: formData.maintenance_type === 'preventive' ? 'Ex : 7 (obligatoire)' : 'Produit maintenable uniquement',
            },
            {
              name: 'intervalle_unite', label: 'Intervalle — unité', type: 'select',
              required: formData.maintenance_type === 'preventive',
              disabled: formData.maintenance_type !== 'preventive',
              options: [
                { value: 'minute', label: 'Minute(s)' },
                { value: 'heure', label: 'Heure(s)' },
                { value: 'jour', label: 'Jour(s)' },
                { value: 'mois', label: 'Mois' },
                { value: 'annee', label: 'Année(s)' },
              ],
            },
          ]}
          values={formData}
          error={formError}
          loading={formLoading}
          submitLabel={editId != null ? 'Enregistrer' : 'Créer'}
          onChange={handleProductChange}
          onClose={closeProductModal}
          onSubmit={handleSubmit}
        />
      )}

      {/* Modale d'ajout rapide (Catégorie / Fournisseur) — empilée au-dessus du formulaire produit */}
      {quickAdd && (
        <ResourceModal
          title={quickAddConfig[quickAdd].title}
          icon={quickAddConfig[quickAdd].icon}
          fields={quickAddConfig[quickAdd].fields}
          values={quickAddData}
          error={quickAddError}
          loading={quickAddLoading}
          submitLabel="Créer"
          onChange={setQuickAddData}
          onClose={() => setQuickAdd(null)}
          onSubmit={handleQuickAddSubmit}
        />
      )}
    </div>
  );
}
