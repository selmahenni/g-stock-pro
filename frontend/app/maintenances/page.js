'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DataTableServer from '../../components/DataTableServer';
import FilterSelect from '../../components/FilterSelect';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import ResourceModal from '../../components/ResourceModal';
import StatusBadge from '../../components/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import { genererRapportMaintenance } from '../../lib/pdfDocuments';
import {
  Wrench, RefreshCw, AlertCircle, Trash2, Pencil,
  Clock, CheckCircle2, Calendar, ClipboardList, CalendarClock, AlertTriangle,
  ShieldAlert, FileDown, Filter,
} from 'lucide-react';

/**
 * @component PageMaintenances
 * @description Suivi global des tickets de maintenance (V2) + échéancier préventif.
 * La création de tickets se fait sur la fiche actif (Déclarer une panne / Enregistrer un entretien).
 */
export default function PageMaintenances() {
  // Tickets : pagination + recherche + filtres (statut via onglets, type via sélecteur), serveur
  const list = usePaginatedResource('maintenances', 'maintenances', { pageSize: 10 });
  const maintenances = list.rows;
  const loading = list.isFetching;
  const firstLoad = loading && !list.data;
  const error = list.isError ? (list.error?.message || 'Erreur de chargement.') : null;
  const [refreshKey, setRefreshKey] = useState(0); // rafraîchit l'échéancier après mutation
  // Référentiels du formulaire « Déclarer une panne » — chargés à l'ouverture de la modale (lazy)
  const [actifs, setActifs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [optionsChargees, setOptionsChargees] = useState(false);
  // Échéancier préventif : calculé CÔTÉ SERVEUR (top N + totaux), pas de chargement massif
  const [echeancier, setEcheancier] = useState([]);
  const [echeancierTotal, setEcheancierTotal] = useState(0);
  const [enRetard, setEnRetard] = useState(0);
  const { canAccess } = usePermissions();

  // Onglet actif = dérivé du filtre statut serveur (onglets + sélecteur restent synchronisés)
  const activeTab = list.filters.statut || 'tous';

  // ── Édition de ticket ───────────────────────────────────────────────
  const [editingTicket, setEditingTicket] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [editFormError, setEditFormError] = useState(null);

  // ── Déclaration de panne (maintenance curative à la demande) ─────────
  // NB : `technicien_id` est conservé (état + envoi backend) mais masqué de l'UI
  //      pour un usage ultérieur (assignation depuis l'édition du ticket).
  const [techniciens, setTechniciens] = useState([]);
  const [showPanne, setShowPanne] = useState(false);
  const [panneData, setPanneData] = useState({ produit_id: '', actif_id: '', technicien_id: '', rapport: '' });
  const [panneLoading, setPanneLoading] = useState(false);
  const [panneError, setPanneError] = useState(null);
  const canDeclarer = canAccess('actifs', 'update'); // super_admin, magasinier, technicien

  // Charge l'échéancier préventif depuis le backend (calcul serveur : top 12 + totaux).
  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/maintenances/echeancier?limit=12', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!actif) return;
        setEcheancier((data.echeancier || []).map(e => ({
          actif_id: e.actif_id,
          numero_serie: e.numero_serie,
          produit: e.produit || '—',
          derniere: null,
          prochaine: e.prochaine ? new Date(e.prochaine).getTime() : null,
        })));
        setEcheancierTotal(data.total || 0);
        setEnRetard(data.en_retard || 0);
      } catch {}
    })();
    return () => { actif = false; };
  }, [refreshKey]);

  // Tick périodique : force le recalcul du « délai restant » affiché (sans requête réseau).
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Options du formulaire « Déclarer une panne » — chargées UNIQUEMENT à l'ouverture de la modale.
  const chargerOptions = async () => {
    if (optionsChargees) return;
    try {
      const [actifsRes, produitsRes, annuaireRes] = await Promise.all([
        fetch(process.env.NEXT_PUBLIC_API_URL + '/api/actifs?limit=500', { credentials: 'include' }),
        fetch(process.env.NEXT_PUBLIC_API_URL + '/api/produits?limit=500', { credentials: 'include' }),
        fetch(process.env.NEXT_PUBLIC_API_URL + '/api/messages/annuaire', { credentials: 'include' }),
      ]);
      if (actifsRes.ok) { const data = await actifsRes.json(); setActifs(data.actifs || []); }
      if (produitsRes.ok) { const data = await produitsRes.json(); setProduits(data.produits || []); }
      if (annuaireRes.ok) {
        const data = await annuaireRes.json();
        setTechniciens((data.utilisateurs || []).filter(u => u.role === 'technicien'));
      }
      setOptionsChargees(true);
    } catch {}
  };

  const ouvrirPanne = () => { setPanneError(null); chargerOptions(); setShowPanne(true); };

  const formatDelai = (ms) => {
    const abs = Math.abs(ms);
    const min = 60000, h = 60 * min, j = 24 * h;
    if (abs < h) return `${Math.max(1, Math.round(abs / min))} min`;
    if (abs < j) return `${Math.round(abs / h)} h`;
    return `${Math.round(abs / j)} j`;
  };

  const canUpdate = canAccess('maintenances', 'update');
  const canDelete = canAccess('maintenances', 'delete');

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression de ce ticket ?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maintenances/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      (list.refetch(), setRefreshKey(p => p + 1));
    } catch (err) { alert(err.message); }
  };

  // ── Édition de ticket ───────────────────────────────────────────────
  const openEditModal = (ticket) => {
    setEditFormError(null);
    setEditFormData({
      statut: ticket.statut || 'planifie',
      rapport: ticket.rapport || '',
      cout: ticket.cout != null ? ticket.cout : '',
      date_intervention: ticket.date_intervention ? new Date(ticket.date_intervention).toISOString().split('T')[0] : '',
    });
    setEditingTicket(ticket);
  };

  const handleEditTicket = async (e) => {
    e.preventDefault();
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maintenances/${editingTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          statut: editFormData.statut || null,
          rapport: editFormData.rapport || null,
          cout: editFormData.cout !== '' ? Number(editFormData.cout) : null,
          date_intervention: editFormData.date_intervention || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la mise à jour');
      setEditingTicket(null);
      (list.refetch(), setRefreshKey(p => p + 1));
    } catch (err) {
      setEditFormError(err.message);
    } finally {
      setEditFormLoading(false);
    }
  };

  // Statistiques GLOBALES (renvoyées par le backend, indépendantes de la page/du filtre)
  const stats = list.data?.stats || {};
  const total = stats.total ?? 0;
  const enCours = stats.en_cours ?? 0;
  const terminees = stats.termine ?? 0;
  const planifiees = stats.planifie ?? 0;

  // L'onglet (et le sélecteur de statut) pilotent le même filtre STATUT côté serveur
  const selectTab = (key) => {
    list.setFilters({ ...list.filters, statut: key === 'tous' ? '' : key });
  };

  const tabs = [
    { key: 'tous',     label: 'Tous',      count: total,      icon: ClipboardList, cls: 'text-primary' },
    { key: 'en_cours', label: 'En cours',   count: enCours,    icon: Clock,         cls: 'text-amber-500' },
    { key: 'planifie', label: 'Planifiés',  count: planifiees, icon: Calendar,      cls: 'text-sky-500' },
    { key: 'termine',  label: 'Terminés',   count: terminees,  icon: CheckCircle2,  cls: 'text-emerald-500' },
  ];

  // Badges unifiés (composant partagé StatusBadge)
  const statutBadge = (statut) => <StatusBadge status={statut} />;

  const typeBadge = (type) => type === 'curatif'
    ? <StatusBadge label="Curatif" tone="error" icon={ShieldAlert} />
    : <StatusBadge label="Préventif" tone="info" icon={CalendarClock} />;

  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'actif_serie',
      header: 'Actif',
      cell: (info) => (
        <Link href={`/actifs/${info.row.original.actif_id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
          {info.getValue() || '—'}
        </Link>
      ),
    },
    {
      accessorKey: 'produit_libelle',
      header: 'Produit',
      cell: (info) => <span className="text-sm">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'type_maintenance',
      header: 'Type',
      cell: (info) => typeBadge(info.getValue()),
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: (info) => statutBadge(info.getValue()),
    },
    {
      accessorKey: 'technicien_nom',
      header: 'Technicien',
      cell: (info) => <span className="font-medium">{info.getValue() || <span className="text-base-content/40">—</span>}</span>,
    },
    {
      accessorKey: 'date_intervention',
      header: 'Date',
      cell: (info) => {
        const d = info.getValue();
        if (!d) return '—';
        return <span className="text-xs text-base-content/70">{new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
      },
    },
    {
      accessorKey: 'rapport',
      header: 'Rapport',
      cell: (info) => {
        const r = info.getValue();
        if (!r) return <span className="text-base-content/40">—</span>;
        return <span className="text-xs text-base-content/70 line-clamp-2 max-w-[220px]">{r}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-1">
          {/* Rapport PDF : disponible uniquement quand le ticket est TERMINÉ */}
          {info.row.original.statut === 'termine' && (
            <button
              onClick={() => genererRapportMaintenance(info.row.original)}
              className="btn btn-outline btn-xs rounded-lg border-primary/30 text-base-content/40 hover:text-primary hover:bg-base-200 gap-1"
              title="Télécharger le rapport PDF"
            >
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
          )}
          {canUpdate && (
            <button
              onClick={() => openEditModal(info.row.original)}
              className="btn btn-ghost btn-xs rounded-lg text-amber-500 hover:bg-amber-500/10"
              title="Modifier le ticket"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && <button onClick={() => handleDelete(info.row.original.id)} className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      ),
    },
  ];

  // ── Déclaration de panne : actifs éligibles + envoi ─────────────────
  // Seuls les produits MAINTENABLES peuvent tomber en panne.
  const produitsMaintenables = produits.filter(p => p.est_maintenable);
  const idsMaintenables = new Set(produitsMaintenables.map(p => String(p.id)));
  // On ne propose pas les actifs déjà en maintenance ni au rebut, on les restreint aux
  // produits maintenables, et au produit choisi si un filtre est sélectionné.
  const actifsPourPanne = actifs.filter(a =>
    a.statut !== 'maintenance' && a.statut !== 'rebut' &&
    idsMaintenables.has(String(a.produit_id)) &&
    (!panneData.produit_id || String(a.produit_id) === String(panneData.produit_id))
  );

  // Réinitialise l'actif si le filtre produit change.
  const handlePanneChange = (next) => {
    if (next.produit_id !== panneData.produit_id) next = { ...next, actif_id: '' };
    setPanneData(next);
  };

  const handleDeclarerPanne = async (e) => {
    e.preventDefault();
    setPanneError(null);
    if (!panneData.actif_id) { setPanneError('Sélectionnez l\'actif concerné.'); return; }
    if (!panneData.rapport || !panneData.rapport.trim()) { setPanneError('Décrivez la panne constatée.'); return; }
    setPanneLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/actifs/${panneData.actif_id}/panne`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rapport: panneData.rapport.trim(),
          technicien_id: panneData.technicien_id ? Number(panneData.technicien_id) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la déclaration de la panne.');
      setShowPanne(false);
      setPanneData({ produit_id: '', actif_id: '', technicien_id: '', rapport: '' });
      (list.refetch(), setRefreshKey(p => p + 1));
    } catch (err) {
      setPanneError(err.message);
    } finally {
      setPanneLoading(false);
    }
  };

  const panneFields = [
    {
      name: 'produit_id', label: 'Produit (filtre)', type: 'select', placeholder: 'Tous les produits maintenables',
      options: produitsMaintenables.map(p => ({ value: p.id, label: `${p.libelle}${p.sku ? ` - ${p.sku}` : ''}` })),
    },
    {
      name: 'actif_id', label: 'Actif en panne', type: 'select', required: true,
      placeholder: actifsPourPanne.length ? 'Sélectionner l\'équipement' : 'Aucun actif disponible',
      options: actifsPourPanne.map(a => ({
        value: a.id,
        label: `${a.numero_serie}${a.produit_libelle ? ` — ${a.produit_libelle}` : ''}${a.entrepot_nom ? ` · ${a.entrepot_nom}` : ''}`,
      })),
    },
    {
      name: 'rapport', label: 'Description de la panne', type: 'textarea', required: true,
      placeholder: 'Symptômes constatés, contexte, urgence…',
    },
    // Champ « technicien » volontairement retiré de l'UI (assignation ultérieure possible).
    // `technicien_id` reste dans l'état et l'envoi backend ; la liste `techniciens` est chargée.
  ];

  // ── Champs de la modale d'édition ───────────────────────────────────
  const editFields = [
    { name: 'statut', label: 'Statut', type: 'select', options: [
      { value: 'planifie', label: 'Planifié' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'termine', label: 'Terminé' },
      { value: 'annule', label: 'Annulé' },
    ] },
    { name: 'date_intervention', label: 'Date d\'intervention', type: 'date' },
    { name: 'rapport', label: 'Rapport', type: 'textarea', placeholder: 'Actions réalisées, pièces remplacées, observations...' },
    { name: 'cout', label: 'Coût (DA)', type: 'number', min: 0, step: '0.01', placeholder: '0.00' },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              Maintenance
            </h1>
            <p className="text-sm text-base-content/60 mt-1">Tickets d'intervention (préventif / curatif) et échéancier préventif.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => (list.refetch(), setRefreshKey(p => p + 1))} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            {canDeclarer && (
              <button onClick={ouvrirPanne} className="btn btn-error btn-sm rounded-xl gap-2 shadow-lg shadow-error/25 hover:scale-105 transition-all">
                <AlertTriangle className="w-4 h-4" /> Déclarer une panne
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><ClipboardList className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Total Tickets</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : total}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500"><Calendar className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Planifiés</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : planifiees}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Clock className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">En Cours</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : enCours}</h3></div>
          </div>
          <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 hover:shadow-lg transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><CheckCircle2 className="w-6 h-6" /></div>
            <div><p className="text-xs text-base-content/50 font-semibold uppercase">Terminés</p><h3 className="text-2xl font-bold mt-0.5">{loading ? '—' : terminees}</h3></div>
          </div>
        </div>

        {/* Échéancier préventif */}
        {echeancierTotal > 0 && (
          <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md overflow-hidden">
            <div className="px-5 py-4 border-b border-base-200 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-base-content">Échéancier préventif</h2>
              {enRetard > 0 && (
                <span className="inline-flex items-center gap-1 badge badge-sm py-2 px-2.5 rounded-lg font-semibold bg-rose-500/10 text-error border border-rose-500/20">
                  <AlertTriangle className="w-3 h-3" /> {enRetard} en retard
                </span>
              )}
              <span className="text-xs font-medium text-base-content/50 ml-auto">{echeancierTotal} actif{echeancierTotal > 1 ? 's' : ''} suivi{echeancierTotal > 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-md w-full">
                <thead>
                  <tr className="bg-base-200/40 text-base-content/80 text-xs uppercase tracking-wider">
                    <th className="py-3 px-5 text-left">Actif</th>
                    <th className="py-3 px-5 text-left">Produit</th>
                    <th className="py-3 px-5 text-left">Dernière intervention</th>
                    <th className="py-3 px-5 text-left">Prochaine échéance</th>
                    <th className="py-3 px-5 text-left">Délai restant</th>
                  </tr>
                </thead>
                <tbody>
                  {echeancier.slice(0, 12).map(e => {
                    const fmt = (ms) => ms ? new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                    const UN_JOUR = 86400000;
                    // Délai restant recalculé à l'affichage (rafraîchi par `tick`)
                    const msRestants = (e.prochaine || 0) - Date.now();
                    let badge;
                    if (msRestants < 0) {
                      badge = <span className="inline-flex items-center gap-1 badge badge-sm py-2 px-2.5 rounded-lg font-semibold bg-rose-500/10 text-error border border-rose-500/20"><AlertTriangle className="w-3 h-3" /> En retard de {formatDelai(msRestants)}</span>;
                    } else if (msRestants <= UN_JOUR) {
                      badge = <span className="inline-flex items-center gap-1 badge badge-sm py-2 px-2.5 rounded-lg font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock className="w-3 h-3" /> Dans {formatDelai(msRestants)}</span>;
                    } else {
                      badge = <span className="inline-flex items-center gap-1 badge badge-sm py-2 px-2.5 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> Dans {formatDelai(msRestants)}</span>;
                    }
                    return (
                      <tr key={e.actif_id} className="border-b border-base-200/60 hover:bg-base-200/30 transition-colors">
                        <td className="py-3 px-5 font-mono text-sm font-semibold">
                          <Link href={`/actifs/${e.actif_id}`} className="text-primary hover:underline">{e.numero_serie}</Link>
                        </td>
                        <td className="py-3 px-5 text-sm">{e.produit}</td>
                        <td className="py-3 px-5 text-sm text-base-content/70">{e.derniere ? fmt(e.derniere) : <span className="text-base-content/40">Jamais</span>}</td>
                        <td className="py-3 px-5 text-sm font-medium">{fmt(e.prochaine)}</td>
                        <td className="py-3 px-5">{badge}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Onglets de filtrage ──────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-base-100 rounded-2xl border border-base-200 shadow-sm p-1.5 w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => selectTab(tab.key)}
                className={`btn btn-sm rounded-xl gap-1.5 transition-all ${
                  isActive
                    ? 'btn-primary shadow-md'
                    : 'btn-ghost text-base-content/60 hover:text-base-content'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`badge badge-xs font-bold ${isActive ? 'badge-primary-content bg-white/20' : 'badge-ghost'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div>
          {firstLoad ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des tickets...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" /><div><h3 className="font-bold text-error">Erreur</h3><p className="text-sm text-base-content/70 mt-1">{error}</p>
                <button onClick={() => (list.refetch(), setRefreshKey(p => p + 1))} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button></div>
            </div>
          ) : (
            <DataTableServer
              columns={columns}
              data={maintenances}
              total={list.total}
              pageCount={list.pageCount}
              pagination={list.pagination}
              onPaginationChange={list.setPagination}
              search={list.search}
              onSearchChange={list.onSearchChange}
              loading={loading}
              searchPlaceholder="Rechercher par n° série, produit, technicien..."
              toolbar={
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterSelect
                    value={list.filters.statut}
                    onChange={(v) => list.setFilters({ ...list.filters, statut: v })}
                    options={[
                      { value: 'planifie', label: 'Planifié' },
                      { value: 'en_cours', label: 'En cours' },
                      { value: 'termine', label: 'Terminé' },
                      { value: 'annule', label: 'Annulé' },
                    ]}
                    allLabel="Tous les statuts"
                    title="Filtrer par statut de maintenance"
                  />
                  <FilterSelect
                    value={list.filters.type}
                    onChange={(v) => list.setFilters({ ...list.filters, type: v })}
                    options={[
                      { value: 'preventif', label: 'Préventif' },
                      { value: 'curatif', label: 'Curatif' },
                    ]}
                    allLabel="Tous les types"
                    title="Filtrer par type de maintenance"
                  />
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* ── Modale : Déclarer une panne (maintenance curative) ─────────── */}
      {showPanne && (
        <ResourceModal
          title="Déclarer une panne"
          icon={AlertTriangle}
          fields={panneFields}
          values={panneData}
          error={panneError}
          loading={panneLoading}
          submitLabel="Déclarer la panne"
          onChange={handlePanneChange}
          onClose={() => setShowPanne(false)}
          onSubmit={handleDeclarerPanne}
        />
      )}

      {/* ── Modale d'édition de ticket ─────────────────────────────────── */}
      {editingTicket && (
        <ResourceModal
          title={`Modifier le ticket #${editingTicket.id}`}
          icon={Pencil}
          fields={editFields}
          values={editFormData}
          error={editFormError}
          loading={editFormLoading}
          submitLabel="Enregistrer"
          onChange={setEditFormData}
          onClose={() => setEditingTicket(null)}
          onSubmit={handleEditTicket}
        />
      )}
    </div>
  );
}
