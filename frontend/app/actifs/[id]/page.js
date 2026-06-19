'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ResourceModal from '../../../components/ResourceModal';
import usePermissions from '../../../hooks/usePermissions';
import { genererRapportMaintenance } from '../../../lib/pdfDocuments';
import {
  ArrowLeft, RefreshCw, AlertCircle, Layers, Package, Building2, MapPin,
  DollarSign, Hash, Wrench, AlertTriangle, CalendarClock, CheckCircle2,
  Monitor, Clock, XCircle, ShieldAlert, ClipboardCheck, FileDown,
} from 'lucide-react';

/**
 * @component FicheActif
 * @description Vue détaillée d'un actif unitaire (V2 maintenance) :
 * informations, prochaine échéance préventive, historique de maintenance,
 * et actions « Déclarer une panne » / « Enregistrer un entretien ».
 */
export default function FicheActif() {
  const { id } = useParams();
  const { role } = usePermissions();

  const [actif, setActif] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modales : 'panne' | 'entretien' | null
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  const canPanne = ['super_admin', 'magasinier', 'technicien'].includes(role);
  const canEntretien = ['super_admin', 'technicien'].includes(role);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [actifRes, histRes] = await Promise.all([
        fetch(`http://localhost:5000/api/actifs/${id}`, { credentials: 'include' }),
        fetch(`http://localhost:5000/api/actifs/${id}/maintenances`, { credentials: 'include' }),
      ]);
      if (actifRes.status === 401 || actifRes.status === 403) { window.location.href = '/login'; return; }
      if (!actifRes.ok) throw new Error(actifRes.status === 404 ? 'Actif introuvable.' : `Erreur serveur (${actifRes.status})`);
      setActif(await actifRes.json());
      const hist = histRes.ok ? await histRes.json() : { maintenances: [] };
      setHistorique(hist.maintenances || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  // ── Modales d'action ────────────────────────────────────────────────
  const openModal = (type) => {
    setFormError(null);
    setFormData(type === 'entretien'
      ? { type_maintenance: 'preventif', date_intervention: '', rapport: '', cout: '' }
      : { rapport: '' });
    setModal(type);
  };

  const submitModal = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const endpoint = modal === 'panne' ? 'panne' : 'entretien';
      const payload = modal === 'panne'
        ? { rapport: formData.rapport || null }
        : {
            type_maintenance: formData.type_maintenance || 'preventif',
            date_intervention: formData.date_intervention || null,
            rapport: formData.rapport || null,
            cout: formData.cout ? Number(formData.cout) : null,
          };
      const res = await fetch(`http://localhost:5000/api/actifs/${id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de l\'enregistrement');
      setModal(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Affichage ───────────────────────────────────────────────────────
  const statutBadge = (statut) => {
    const map = {
      en_stock:    { label: 'En stock',    cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
      affecte:     { label: 'Affecté',     cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',    icon: Monitor },
      maintenance: { label: 'Maintenance', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20',       icon: Clock },
      rebut:       { label: 'Rebut',       cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20',          icon: XCircle },
    };
    const s = map[statut] || { label: statut || '—', cls: 'badge-ghost', icon: null };
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1.5 badge py-3 px-3 rounded-lg font-semibold border ${s.cls}`}>{Icon && <Icon className="w-3.5 h-3.5" />} {s.label}</span>;
  };

  const typeBadge = (type) => type === 'curatif'
    ? <span className="inline-flex items-center gap-1 badge badge-sm rounded-md font-semibold border bg-rose-500/10 text-rose-600 border-rose-500/20"><ShieldAlert className="w-3 h-3" /> Curatif</span>
    : <span className="inline-flex items-center gap-1 badge badge-sm rounded-md font-semibold border bg-sky-500/10 text-sky-600 border-sky-500/20"><CalendarClock className="w-3 h-3" /> Préventif</span>;

  const ticketStatutBadge = (s) => {
    const map = {
      planifie: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
      en_cours: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      termine:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      annule:   'bg-base-300 text-base-content/50 border-base-300',
    };
    const labels = { planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' };
    return <span className={`badge badge-sm rounded-md font-semibold border ${map[s] || 'badge-ghost'}`}>{labels[s] || s}</span>;
  };

  const fmtDate = (d, withTime = false) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) })
    : '—';

  const prochaine = actif?.date_prochaine_preventive ? new Date(actif.date_prochaine_preventive) : null;
  const enRetard = prochaine && prochaine.getTime() <= Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200/50 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Barre de navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/actifs" className="btn btn-ghost btn-sm rounded-xl gap-2"><ArrowLeft className="w-4 h-4" /> Retour à l'inventaire</Link>
          <button onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement de la fiche actif...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-lg rounded-2xl border border-rose-500/25 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-rose-800">Erreur</h3>
              <p className="text-sm text-rose-700/80 mt-1">{error}</p>
              <Link href="/actifs" className="btn btn-sm btn-outline border-rose-500/30 text-rose-800 font-semibold rounded-lg mt-4">Retour à l'inventaire</Link>
            </div>
          </div>
        ) : actif && (
          <>
            {/* Bandeau d'alerte échéance dépassée */}
            {enRetard && (
              <div className="alert rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 flex items-start gap-3 p-4">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="text-sm font-medium">Maintenance préventive échue depuis le {fmtDate(prochaine, true)}. Une intervention est requise.</span>
              </div>
            )}

            {/* En-tête actif */}
            <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-base-content/50"><Hash className="w-3.5 h-3.5" /> Actif #{actif.id}</div>
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mt-1 flex items-center gap-2">
                    <Layers className="w-7 h-7 text-primary" /> {actif.numero_serie}
                  </h1>
                  <div className="mt-3">{statutBadge(actif.statut)}</div>
                </div>
                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {canPanne && (
                    <button onClick={() => openModal('panne')} className="btn btn-sm rounded-xl gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20">
                      <ShieldAlert className="w-4 h-4" /> Déclarer une panne
                    </button>
                  )}
                  {canEntretien && (
                    <button onClick={() => openModal('entretien')} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25">
                      <ClipboardCheck className="w-4 h-4" /> Enregistrer un entretien
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="flex items-start gap-2"><Package className="w-4 h-4 text-base-content/40 mt-0.5" /><div><p className="text-xs text-base-content/50 font-semibold uppercase">Produit</p><p className="font-semibold mt-0.5">{actif.produit_libelle || '—'}</p></div></div>
                <div className="flex items-start gap-2"><Building2 className="w-4 h-4 text-base-content/40 mt-0.5" /><div><p className="text-xs text-base-content/50 font-semibold uppercase">Entrepôt</p><p className="font-semibold mt-0.5">{actif.entrepot_nom || '—'}</p></div></div>
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-base-content/40 mt-0.5" /><div><p className="text-xs text-base-content/50 font-semibold uppercase">Emplacement</p><p className="font-semibold mt-0.5">{actif.emplacement || '—'}</p></div></div>
                <div className="flex items-start gap-2"><DollarSign className="w-4 h-4 text-base-content/40 mt-0.5" /><div><p className="text-xs text-base-content/50 font-semibold uppercase">Prix</p><p className="font-semibold mt-0.5">{actif.prix_unitaire != null ? `${parseFloat(actif.prix_unitaire).toLocaleString('fr-FR')} DA` : '—'}</p></div></div>
              </div>

              <div className="mt-6 pt-4 border-t border-base-200 flex items-center gap-2">
                <CalendarClock className={`w-5 h-5 ${enRetard ? 'text-amber-500' : 'text-base-content/40'}`} />
                <span className="text-sm text-base-content/60 font-semibold uppercase">Prochaine maintenance préventive :</span>
                <span className={`text-sm font-bold ${enRetard ? 'text-amber-600' : ''}`}>
                  {prochaine ? fmtDate(prochaine, true) : 'Non planifiée (produit non préventif)'}
                </span>
              </div>
            </div>

            {/* Historique de maintenance */}
            <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-base-200 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-base-content">Historique de Maintenance</h2>
                <span className="text-xs font-medium text-base-content/50 ml-auto">{historique.length} ticket{historique.length > 1 ? 's' : ''}</span>
              </div>

              {historique.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <div className="p-3 bg-base-200 rounded-full text-base-content/40"><Wrench className="w-6 h-6" /></div>
                  <p className="text-sm font-semibold text-base-content/70">Aucune intervention</p>
                  <p className="text-xs text-base-content/50">Cet actif n'a pas encore de ticket de maintenance.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-md w-full">
                    <thead>
                      <tr className="bg-base-200/40 text-base-content/80 text-xs uppercase tracking-wider">
                        <th className="py-3 px-5 text-left">Date</th>
                        <th className="py-3 px-5 text-left">Type</th>
                        <th className="py-3 px-5 text-left">Statut</th>
                        <th className="py-3 px-5 text-left">Technicien</th>
                        <th className="py-3 px-5 text-left">Rapport</th>
                        <th className="py-3 px-5 text-left">Coût</th>
                        <th className="py-3 px-5 text-left">PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historique.map(t => (
                        <tr key={t.id} className="border-b border-base-200/60 hover:bg-base-200/30 transition-colors">
                          <td className="py-3 px-5 text-sm text-base-content/70">{fmtDate(t.date_intervention)}</td>
                          <td className="py-3 px-5">{typeBadge(t.type_maintenance)}</td>
                          <td className="py-3 px-5">{ticketStatutBadge(t.statut)}</td>
                          <td className="py-3 px-5 text-sm">{t.technicien_nom || <span className="text-base-content/40">—</span>}</td>
                          <td className="py-3 px-5 text-sm text-base-content/70 max-w-[260px]"><span className="line-clamp-2">{t.rapport || '—'}</span></td>
                          <td className="py-3 px-5 text-sm font-semibold">{t.cout != null ? `${parseFloat(t.cout).toLocaleString('fr-FR')} DA` : '—'}</td>
                          <td className="py-3 px-5">
                            <button
                              onClick={() => genererRapportMaintenance({ ...t, actif_serie: actif.numero_serie, produit_libelle: actif.produit_libelle })}
                              className="btn btn-ghost btn-xs rounded-lg text-rose-500 hover:bg-rose-500/10"
                              title="Générer le rapport (PDF)"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modale : Déclarer une panne */}
      {modal === 'panne' && (
        <ResourceModal
          title="Déclarer une panne"
          icon={ShieldAlert}
          fields={[
            { name: 'rapport', label: 'Description de la panne', type: 'textarea', required: true, placeholder: 'Symptômes constatés, contexte...' },
          ]}
          values={formData}
          error={formError}
          loading={formLoading}
          submitLabel="Déclarer la panne"
          onChange={setFormData}
          onClose={() => setModal(null)}
          onSubmit={submitModal}
        />
      )}

      {/* Modale : Enregistrer un entretien */}
      {modal === 'entretien' && (
        <ResourceModal
          title="Enregistrer un entretien"
          icon={ClipboardCheck}
          fields={[
            { name: 'type_maintenance', label: 'Type', type: 'select', options: [
              { value: 'preventif', label: 'Préventif (planifié)' },
              { value: 'curatif', label: 'Curatif (réparation)' },
            ] },
            { name: 'date_intervention', label: 'Date d\'intervention', type: 'date' },
            { name: 'rapport', label: 'Rapport', type: 'textarea', placeholder: 'Actions réalisées, pièces remplacées...' },
            { name: 'cout', label: 'Coût (DA)', type: 'number', min: 0, step: '0.01', placeholder: '0.00' },
          ]}
          values={formData}
          error={formError}
          loading={formLoading}
          submitLabel="Enregistrer l'entretien"
          onChange={setFormData}
          onClose={() => setModal(null)}
          onSubmit={submitModal}
        />
      )}
    </div>
  );
}
