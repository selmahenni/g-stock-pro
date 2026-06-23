'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DataTableServer from '../../components/DataTableServer';
import FilterSelect from '../../components/FilterSelect';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import ResourceModal from '../../components/ResourceModal';
import { MovementBadge } from '../../components/StatusBadge';
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
  const list = usePaginatedResource('mouvements', 'mouvements', { pageSize: 10 });
  const mouvements = list.rows;
  const loading = list.isFetching;
  const firstLoad = loading && !list.data;
  const error = list.isError ? (list.error?.message || 'Erreur de chargement.') : null;
  const [actifs, setActifs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [entrepots, setEntrepots] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    produit_id: '',      // filtre uniquement (non envoyé) : restreint la liste d'actifs
    actif_id: '',
    type_mouvement: 'entree',
    destinataire: '',
    entrepot_destination_id: '', // utilisé uniquement pour un transfert
    notes: '',
  });
  const { canAccess } = usePermissions();

  // Les options du formulaire (actifs/produits/entrepôts) ne sont chargées
  // QU'À L'OUVERTURE de la modale — pas au chargement de la page — pour ne pas
  // tirer des listes complètes inutilement à l'affichage de l'historique.
  const [optionsChargees, setOptionsChargees] = useState(false);
  const chargerOptions = async () => {
    if (optionsChargees) return;
    try {
      const [actifsRes, produitsRes, entrepotsRes] = await Promise.all([
        fetch('http://localhost:5000/api/actifs?limit=500', { credentials: 'include' }),
        fetch('http://localhost:5000/api/produits?limit=500', { credentials: 'include' }),
        fetch('http://localhost:5000/api/entrepots', { credentials: 'include' }),
      ]);
      if (actifsRes.ok) {
        const data = await actifsRes.json();
        setActifs(data.actifs || []);
      }
      if (produitsRes.ok) {
        const data = await produitsRes.json();
        setProduits(data.produits || []);
      }
      if (entrepotsRes.ok) {
        const data = await entrepotsRes.json();
        setEntrepots(Array.isArray(data) ? data : (data.entrepots || []));
      }
      setOptionsChargees(true);
    } catch {}
  };

  const ouvrirAjout = () => { setFormError(null); chargerOptions(); setShowCreateModal(true); };

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
    if (formData.type_mouvement === 'transfert') return a.statut === 'en_stock' && a.entrepot_id; // doit avoir un entrepôt source
    return true;
  });

  // Actif sélectionné (pour exclure son entrepôt actuel des destinations possibles)
  const actifSelectionne = actifs.find((a) => String(a.id) === String(formData.actif_id));

  const canCreate = canAccess('mouvements', 'create');
  const canDelete = canAccess('mouvements', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de ce mouvement ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/mouvements/${id}`, {
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
      // L'entrepôt est déduit côté backend à partir de l'actif (plus de saisie ici).
      const res = await fetch('http://localhost:5000/api/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          actif_id: Number(formData.actif_id),
          type_mouvement: formData.type_mouvement,
          destinataire: formData.destinataire || null,
          notes: formData.notes || null,
          // Uniquement pour un transfert : entrepôt de destination
          entrepot_destination_id: formData.type_mouvement === 'transfert'
            ? Number(formData.entrepot_destination_id) || null
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création du mouvement');
      setShowCreateModal(false);
      setFormData({ produit_id: '', actif_id: '', type_mouvement: 'entree', destinataire: '', entrepot_destination_id: '', notes: '' });
      list.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const stats = list.data?.stats || {};
  const total = stats.total ?? 0;
  const entrees = stats.entrees ?? 0;
  const sorties = stats.sorties ?? 0;

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'type_mouvement',
      header: 'Type',
      cell: (info) => {
        const m = info.row.original;
        return (
          <div className="flex flex-col gap-1 items-start">
            <MovementBadge type={info.getValue()} />
            {info.getValue() === 'transfert' && (
              <span className="text-[11px] text-base-content/50 whitespace-nowrap">
                {m.entrepot_nom || '?'} → {m.entrepot_destination_nom || '?'}
              </span>
            )}
          </div>
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
      accessorKey: 'destinataire',
      header: 'Destinataire',
      cell: (info) => {
        const d = info.getValue();
        if (!d) return <span className="text-base-content/40">—</span>;
        return <span className="text-sm text-base-content/80">{d}</span>;
      },
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
            {/* Bon de sortie PDF : réservé aux sorties (masqué pour entrée et transfert) */}
            {estSortie && (
              <button
                onClick={() => genererBonDeSortie(m)}
                className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200 gap-1"
                title="Générer le bon de sortie (PDF)"
              >
                <FileDown className="w-3.5 h-3.5" /> Bon de sortie
              </button>
            )}
            {canDelete && <button onClick={() => handleDelete(m.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              Historique des Mouvements
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Traçabilité complète des entrées et sorties de stock.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <Link href="/bons-sortie" className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all" title="Sortir plusieurs actifs à la fois">
                <FileDown className="w-4 h-4" /> Bon de sortie (multi)
              </Link>
            )}
            {canCreate && (
              <button onClick={ouvrirAjout} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Nouveau mouvement
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><FileText className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Mouvements</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : total}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><ArrowDownCircle className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Entrées</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : entrees}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><ArrowUpCircle className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Sorties</p><h3 className="text-2xl font-bold mt-0.5">{firstLoad ? '—' : sorties}</h3></div>
          </div>
        </div>

        <div className="mt-8">
          {firstLoad ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement de l'historique...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
              <div><h3 className="font-bold text-error">Erreur</h3><p className="text-sm text-base-content/70 mt-1">{error}</p>
                <button onClick={() => list.refetch()} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
              </div>
            </div>
          ) : (
            <DataTableServer
              columns={columns}
              data={mouvements}
              total={list.total}
              pageCount={list.pageCount}
              pagination={list.pagination}
              onPaginationChange={list.setPagination}
              search={list.search}
              onSearchChange={list.onSearchChange}
              loading={loading}
              searchPlaceholder="Rechercher par n° série, produit, auteur..."
              toolbar={
                <FilterSelect
                  value={list.filters.type}
                  onChange={(v) => list.setFilters({ ...list.filters, type: v })}
                  options={[
                    { value: 'entree', label: 'Entrée' },
                    { value: 'sortie', label: 'Sortie' },
                    { value: 'transfert', label: 'Transfert' },
                  ]}
                  allLabel="Tous les types"
                  title="Filtrer par type de mouvement"
                />
              }
            />
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
              { value: 'transfert', label: 'Transfert (d\'un entrepôt à un autre)' },
            ] },
            {
              name: 'produit_id', label: 'Produit (filtre)', type: 'select', placeholder: 'Tous les produits',
              options: produits.map(p => ({ value: p.id, label: `${p.libelle}${p.sku ? ` - ${p.sku}` : ''}` })),
            },
            {
              name: 'actif_id', label: formData.type_mouvement === 'transfert' ? 'Actif à transférer' : 'Actif disponible', type: 'select', required: true,
              placeholder: actifsDisponibles.length ? 'Sélectionner un actif' : 'Aucun actif disponible',
              options: actifsDisponibles.map(a => ({
                value: a.id,
                label: `${a.numero_serie}${a.produit_libelle ? ` - ${a.produit_libelle}` : ''}${a.entrepot_nom ? ` · ${a.entrepot_nom}` : ''}`,
              })),
            },
            ...(formData.type_mouvement === 'transfert' ? [{
              name: 'entrepot_destination_id', label: 'Entrepôt de destination', type: 'select', required: true,
              placeholder: actifSelectionne ? 'Sélectionner la destination' : 'Choisissez d\'abord un actif',
              options: entrepots
                .filter(e => !actifSelectionne || String(e.id) !== String(actifSelectionne.entrepot_id))
                .map(e => ({ value: e.id, label: e.nom })),
            }] : [{
              name: 'destinataire',
              label: formData.type_mouvement === 'sortie' ? 'Destinataire / Bénéficiaire' : 'Destinataire (optionnel)',
              placeholder: formData.type_mouvement === 'sortie' ? 'Nom du service, de la personne ou du chantier…' : 'Optionnel',
            }]),
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
