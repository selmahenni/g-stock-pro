'use client';

import React, { useState, useEffect, useCallback } from 'react';
import QrScanner from './QrScanner';
import StatusBadge from './StatusBadge';
import {
  X, ScanLine, Package, Building2, AlertCircle, CheckCircle2, Save, RefreshCw,
} from 'lucide-react';

const API = 'http://localhost:5000/api';
const STATUTS = [
  { value: 'en_stock', label: 'En stock' },
  { value: 'affecte', label: 'Affecté' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'rebut', label: 'Rebut' },
];

/**
 * @component AuditScanner
 * @description Session d'audit physique par scan. À chaque code lu (n° de série), recherche
 * l'actif puis ouvre une modale rapide : détails (produit, entrepôt, statut) + mise à jour
 * rapide (confirmer présence, changer le statut, changer l'entrepôt). « Scanner suivant »
 * relance la caméra pour enchaîner l'audit.
 *
 * @param {Function} onClose   - Ferme entièrement le mode audit.
 * @param {Function} onUpdated - Appelé après une mise à jour réussie (ex: refetch inventaire).
 */
export default function AuditScanner({ onClose, onUpdated }) {
  const [phase, setPhase] = useState('scanning'); // 'scanning' | 'result'
  const [entrepots, setEntrepots] = useState([]);
  const [serie, setSerie] = useState('');
  const [actif, setActif] = useState(null);        // objet actif | 'notfound' | null
  const [form, setForm] = useState({ statut: '', entrepot_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/entrepots`, { credentials: 'include' });
        if (res.ok) { const d = await res.json(); setEntrepots(Array.isArray(d) ? d : (d.entrepots || [])); }
      } catch { /* l'entrepôt restera non modifiable */ }
    })();
  }, []);

  // Recherche de l'actif scanné
  const lookup = useCallback(async (texte) => {
    const s = String(texte).trim();
    setSerie(s); setError(null); setSaved(false); setLoading(true); setPhase('result');
    try {
      const res = await fetch(`${API}/actifs/serie/${encodeURIComponent(s)}`, { credentials: 'include' });
      if (res.status === 404) { setActif('notfound'); return; }
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const a = await res.json();
      setActif(a);
      setForm({ statut: a.statut || 'en_stock', entrepot_id: a.entrepot_id || '' });
    } catch (e) {
      setError(e.message); setActif('notfound');
    } finally {
      setLoading(false);
    }
  }, []);

  const scannerSuivant = () => {
    setActif(null); setError(null); setSaved(false); setPhase('scanning');
  };

  const enregistrer = async () => {
    if (!actif || actif === 'notfound') return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/actifs/${actif.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: form.statut, entrepot_id: Number(form.entrepot_id) || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.message || 'Échec de la mise à jour.');
      setSaved(true);
      onUpdated?.();
      // Reflète le changement dans l'affichage (et l'état « modifié » repasse à faux)
      setActif((prev) => ({
        ...prev,
        statut: form.statut,
        entrepot_id: Number(form.entrepot_id) || null,
        entrepot_nom: entrepots.find((e) => Number(e.id) === Number(form.entrepot_id))?.nom || prev.entrepot_nom,
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Phase scan ──
  if (phase === 'scanning') {
    return <QrScanner title="Mode Audit — Scanner un actif" onResult={lookup} onClose={onClose} />;
  }

  // ── Phase résultat ──
  const introuvable = actif === 'notfound';
  const modifie = actif && !introuvable &&
    (form.statut !== actif.statut || Number(form.entrepot_id) !== Number(actif.entrepot_id));

  return (
    <div className="modal modal-open">
      <div className="modal-box relative bg-base-100 rounded-xl shadow-xl border border-base-200 max-w-md">
        <button onClick={onClose} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><ScanLine className="w-5 h-5 text-primary" /> Audit — Actif scanné</h3>

        {loading && (
          <div className="py-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        )}

        {!loading && introuvable && (
          <div className="space-y-4">
            <div className="rounded-xl border border-warning/25 bg-warning/5 p-4 flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <span>Aucun actif trouvé pour le code <span className="font-mono font-semibold">{serie}</span>.</span>
            </div>
            <div className="modal-action">
              <button onClick={onClose} className="btn btn-ghost rounded-xl">Fermer</button>
              <button onClick={scannerSuivant} className="btn btn-primary rounded-xl gap-2"><RefreshCw className="w-4 h-4" /> Scanner suivant</button>
            </div>
          </div>
        )}

        {!loading && actif && !introuvable && (
          <div className="space-y-4">
            {/* Détails de l'actif */}
            <div className="rounded-xl border border-base-200 bg-base-200/40 p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-base-content">{actif.numero_serie}</span>
                <StatusBadge status={actif.statut} />
              </div>
              <div className="flex items-center gap-2 text-sm text-base-content/70"><Package className="w-4 h-4 text-base-content/40" /> {actif.produit_libelle || '—'}</div>
              <div className="flex items-center gap-2 text-sm text-base-content/70"><Building2 className="w-4 h-4 text-base-content/40" /> {actif.entrepot_nom || '—'}</div>
            </div>

            {saved && (
              <div className="rounded-xl border border-success/25 bg-success/5 p-3 flex items-center gap-2 text-sm text-success font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Mise à jour enregistrée.
              </div>
            )}
            {error && <div className="rounded-xl border border-error/25 bg-error/5 p-3 text-sm text-error">{error}</div>}

            {/* Mise à jour rapide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1"><span className="label-text font-semibold">Statut</span></label>
                <select value={form.statut} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, statut: e.target.value })); }} className="select select-bordered rounded-xl">
                  {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-control">
                <label className="label py-1"><span className="label-text font-semibold">Entrepôt</span></label>
                <select value={form.entrepot_id} onChange={(e) => { setSaved(false); setForm((f) => ({ ...f, entrepot_id: e.target.value })); }} className="select select-bordered rounded-xl">
                  {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-action flex-wrap gap-2">
              <button onClick={scannerSuivant} className="btn btn-ghost rounded-xl gap-2"><RefreshCw className="w-4 h-4" /> Scanner suivant</button>
              {modifie ? (
                <button onClick={enregistrer} disabled={loading} className="btn btn-primary rounded-xl gap-2"><Save className="w-4 h-4" /> Enregistrer</button>
              ) : (
                <button onClick={scannerSuivant} className="btn btn-success rounded-xl gap-2 text-white"><CheckCircle2 className="w-4 h-4" /> Confirmer présence</button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
