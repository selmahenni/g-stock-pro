'use client';

import React, { useState } from 'react';
import DataTableServer from '../../components/DataTableServer';
import AsyncSelect from '../../components/AsyncSelect';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import usePermissions from '../../hooks/usePermissions';
import { genererBonDeSortieGroupe } from '../../lib/pdfDocuments';
import {
  FileDown, RefreshCw, AlertCircle, Plus, Trash2, Eye, X,
  PackageMinus, Users, Package, Loader2, Printer,
} from 'lucide-react';

const API = 'http://localhost:5000/api';

/**
 * @component PageBonsSortie
 * @description Bons de sortie : documents qui regroupent la sortie de PLUSIEURS actifs
 * en une fois (chaque actif = une ligne = un mouvement de sortie). Complète la sortie
 * unitaire de la page Mouvements, sans la remplacer.
 */
export default function PageBonsSortie() {
  const list = usePaginatedResource('bons-sortie', 'bons_sortie', { pageSize: 10 });
  const bons = list.rows;
  const loading = list.isFetching;
  const firstLoad = loading && !list.data;
  const error = list.isError ? (list.error?.message || 'Erreur de chargement.') : null;
  const { canAccess } = usePermissions();

  const canCreate = canAccess('mouvements', 'create');
  const canDelete = canAccess('mouvements', 'delete');

  // ── Création d'un bon de sortie (multi-actifs) ──────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [destinataire, setDestinataire] = useState('');
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState([]); // [{ id, label }]
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const ouvrirCreate = () => {
    setCreateError(null);
    setDestinataire('');
    setNotes('');
    setLignes([]);
    setShowCreate(true);
  };

  // Recherche serveur des actifs EN STOCK (jamais de chargement massif).
  const chercherActifs = async (q) => {
    const res = await fetch(`${API}/actifs?limit=20&statut=en_stock${q ? `&search=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' });
    if (!res.ok) return [];
    const d = await res.json();
    return (d.actifs || []).map(a => ({
      value: a.id,
      label: `${a.numero_serie}${a.produit_libelle ? ` — ${a.produit_libelle}` : ''}${a.entrepot_nom ? ` · ${a.entrepot_nom}` : ''}`,
    }));
  };

  const ajouterLigne = (value, label) => {
    if (!value) return;
    setLignes((prev) => prev.some(l => String(l.id) === String(value)) ? prev : [...prev, { id: value, label }]);
  };
  const retirerLigne = (id) => setLignes((prev) => prev.filter(l => String(l.id) !== String(id)));

  const soumettreCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (lignes.length === 0) { setCreateError('Ajoutez au moins un actif à sortir.'); return; }
    setCreateLoading(true);
    try {
      const res = await fetch(`${API}/bons-sortie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          destinataire: destinataire || null,
          notes: notes || null,
          actif_ids: lignes.map(l => Number(l.id)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création du bon de sortie.');
      setShowCreate(false);
      list.refetch();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Détail d'un bon ─────────────────────────────────────────────────
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const ouvrirDetail = async (id) => {
    setDetailLoading(true);
    setDetail({ id, lignes: [] });
    try {
      const res = await fetch(`${API}/bons-sortie/${id}`, { credentials: 'include' });
      if (res.ok) setDetail(await res.json());
    } catch {} finally {
      setDetailLoading(false);
    }
  };

  // Télécharge le PDF du bon : récupère le détail (avec ses lignes) puis génère le document.
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const telechargerPdf = async (bon) => {
    setPdfLoadingId(bon.id);
    try {
      // Si on a déjà les lignes (modale détail), on les réutilise ; sinon on les récupère.
      let data = bon.lignes ? bon : null;
      if (!data) {
        const res = await fetch(`${API}/bons-sortie/${bon.id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Impossible de charger le bon de sortie.');
        data = await res.json();
      }
      await genererBonDeSortieGroupe(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet en-tête de bon de sortie ? Les mouvements de stock liés seront conservés.')) return;
    try {
      const res = await fetch(`${API}/bons-sortie/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      list.refetch();
    } catch (err) { alert(err.message); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const columns = [
    {
      accessorKey: 'reference',
      header: 'Référence',
      cell: (info) => (
        <button onClick={() => ouvrirDetail(info.row.original.id)} className="font-mono text-sm font-bold text-primary hover:underline">
          {info.getValue() || `BS-${info.row.original.id}`}
        </button>
      ),
    },
    {
      accessorKey: 'destinataire',
      header: 'Destinataire',
      cell: (info) => info.getValue() ? <span className="text-sm">{info.getValue()}</span> : <span className="text-base-content/40">—</span>,
    },
    {
      accessorKey: 'nb_lignes',
      header: 'Actifs',
      meta: { align: 'right' },
      cell: (info) => <span className="badge badge-sm bg-primary/10 text-primary border border-primary/20 font-semibold">{info.getValue() ?? 0}</span>,
    },
    {
      accessorKey: 'effectue_par_nom',
      header: 'Effectué par',
      cell: (info) => <span className="font-medium">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'cree_le',
      header: 'Date',
      cell: (info) => <span className="text-xs text-base-content/70">{fmtDate(info.getValue())}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          <button onClick={() => ouvrirDetail(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/60 hover:bg-base-200" title="Voir le détail">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => telechargerPdf(info.row.original)} disabled={pdfLoadingId === info.row.original.id} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-primary hover:bg-base-200" title="Télécharger le PDF">
            {pdfLoadingId === info.row.original.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
          </button>
          {canDelete && (
            <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200" title="Supprimer l'en-tête">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">Bons de sortie</h1>
            <p className="text-sm text-base-content/60 mt-1">Sortie groupée de plusieurs actifs en un seul document.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => list.refetch()} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canCreate && (
              <button onClick={ouvrirCreate} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                <Plus className="w-4 h-4" /> Nouveau bon de sortie
              </button>
            )}
          </div>
        </div>

        <div>
          {firstLoad ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des bons de sortie...</p>
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
              data={bons}
              total={list.total}
              pageCount={list.pageCount}
              pagination={list.pagination}
              onPaginationChange={list.setPagination}
              search={list.search}
              onSearchChange={list.onSearchChange}
              loading={loading}
              searchPlaceholder="Rechercher par référence, destinataire..."
            />
          )}
        </div>
      </div>

      {/* ── Modale : Nouveau bon de sortie ──────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><PackageMinus className="w-5 h-5" /></div>
                <h2 className="font-bold text-base-content">Nouveau bon de sortie</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm btn-circle"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={soumettreCreate} className="p-5 space-y-4">
              <div>
                <label className="label-text font-medium flex items-center gap-1.5 mb-1"><Users className="w-3.5 h-3.5 text-base-content/50" /> Destinataire / Bénéficiaire</label>
                <input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} placeholder="Service, personne ou chantier…" className="input input-bordered rounded-lg w-full" />
              </div>

              <div>
                <label className="label-text font-medium flex items-center gap-1.5 mb-1"><Package className="w-3.5 h-3.5 text-base-content/50" /> Ajouter des actifs (en stock)</label>
                <AsyncSelect
                  value=""
                  selectedLabel=""
                  onChange={(v, label) => ajouterLigne(v, label)}
                  fetchOptions={chercherActifs}
                  allLabel="Rechercher un actif à ajouter…"
                  placeholder="N° série, produit…"
                />
                {/* Liste des actifs sélectionnés (lignes du bon) */}
                <div className="mt-3 space-y-1.5">
                  {lignes.length === 0 ? (
                    <p className="text-xs text-base-content/50 italic py-2">Aucun actif ajouté pour l'instant.</p>
                  ) : lignes.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 bg-base-200/50 rounded-lg px-3 py-2">
                      <span className="text-sm font-mono truncate">{l.label}</span>
                      <button type="button" onClick={() => retirerLigne(l.id)} className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {lignes.length > 0 && (
                  <p className="text-xs text-base-content/60 mt-2 font-medium">{lignes.length} actif{lignes.length > 1 ? 's' : ''} à sortir</p>
                )}
              </div>

              <div>
                <label className="label-text font-medium mb-1 block">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motif, référence ou observation" rows={2} className="textarea textarea-bordered rounded-lg w-full" />
              </div>

              {createError && (
                <div className="rounded-lg border border-error/25 bg-error/5 px-3 py-2 text-sm text-error flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {createError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm rounded-lg">Annuler</button>
                <button type="submit" disabled={createLoading || lignes.length === 0} className="btn btn-primary btn-sm rounded-lg gap-2">
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />} Créer le bon ({lignes.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale : Détail d'un bon ────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl border border-base-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><FileDown className="w-5 h-5" /></div>
                <div>
                  <h2 className="font-bold text-base-content">{detail.reference || `Bon #${detail.id}`}</h2>
                  {detail.destinataire && <p className="text-xs text-base-content/60">Pour : {detail.destinataire}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => telechargerPdf(detail)}
                  disabled={detailLoading || pdfLoadingId === detail.id}
                  className="btn btn-primary btn-sm rounded-lg gap-2"
                  title="Télécharger le bon de sortie en PDF"
                >
                  {pdfLoadingId === detail.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} PDF
                </button>
                <button onClick={() => setDetail(null)} className="btn btn-ghost btn-sm btn-circle"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div><span className="text-base-content/50">Effectué par</span><p className="font-medium">{detail.effectue_par_nom || '—'}</p></div>
                <div><span className="text-base-content/50">Date</span><p className="font-medium">{fmtDate(detail.cree_le)}</p></div>
                {detail.notes && <div className="col-span-2"><span className="text-base-content/50">Notes</span><p className="font-medium">{detail.notes}</p></div>}
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-10"><span className="loading loading-spinner text-primary"></span></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-base-200">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="bg-base-200/40 text-xs uppercase tracking-wider text-base-content/70">
                        <th>N° Série</th><th>Produit</th><th>Entrepôt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.lignes || []).length === 0 ? (
                        <tr><td colSpan={3} className="text-center text-base-content/50 py-6">Aucune ligne.</td></tr>
                      ) : detail.lignes.map((l) => (
                        <tr key={l.mouvement_id} className="border-b border-base-200/60">
                          <td className="font-mono text-sm font-semibold">{l.numero_serie || '—'}</td>
                          <td className="text-sm">{l.produit_libelle || '—'}</td>
                          <td className="text-sm text-base-content/70">{l.entrepot_nom || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
