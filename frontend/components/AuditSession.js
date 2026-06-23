'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CameraReader from './CameraReader';
import StatusBadge from './StatusBadge';
import {
  X, ClipboardCheck, PlayCircle, Building2, CheckCircle2, AlertTriangle,
  HelpCircle, PackageX, RefreshCw, ScanLine,
} from 'lucide-react';

const API = 'http://localhost:5000/api';

/**
 * @component AuditSession
 * @description Session d'audit physique CUMULATIVE : on choisit un entrepôt, on scanne en
 * continu, et la liste se remplit à chaque code. À la fin, rapport d'écarts :
 *  - Présents (attendus & scannés), Déplacés (scannés mais rattachés à un autre entrepôt),
 *  - Inconnus (n° de série absent de la base), Manquants (attendus mais non scannés).
 * @param {Function} onClose - Ferme la session.
 */
export default function AuditSession({ onClose }) {
  const [step, setStep] = useState('setup');     // 'setup' | 'scanning' | 'report'
  const [entrepots, setEntrepots] = useState([]);
  const [tousActifs, setTousActifs] = useState([]);
  const [entrepotId, setEntrepotId] = useState('');
  const [vus, setVus] = useState([]);            // [{ key, code, actif, type, at }]
  const [flash, setFlash] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chargement des référentiels (entrepôts + tous les actifs)
  useEffect(() => {
    (async () => {
      try {
        const [rE, rA] = await Promise.all([
          fetch(`${API}/entrepots`, { credentials: 'include' }),
          fetch(`${API}/actifs?limit=1000`, { credentials: 'include' }),
        ]);
        if (rE.ok) { const d = await rE.json(); setEntrepots(Array.isArray(d) ? d : (d.entrepots || [])); }
        if (rA.ok) { const d = await rA.json(); setTousActifs(d.actifs || []); }
      } catch { /* silencieux */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Index n° série → actif (insensible à la casse)
  const parSerie = useMemo(() => {
    const m = new Map();
    tousActifs.forEach((a) => { if (a.numero_serie) m.set(a.numero_serie.toLowerCase(), a); });
    return m;
  }, [tousActifs]);

  // Attendus dans l'entrepôt audité (présence physique → on exclut le rebut)
  const attendus = useMemo(
    () => tousActifs.filter((a) => Number(a.entrepot_id) === Number(entrepotId) && a.statut !== 'rebut'),
    [tousActifs, entrepotId]
  );

  const flasher = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 1600); };

  const onScan = useCallback((code) => {
    const key = code.toLowerCase();
    setVus((prev) => {
      if (prev.some((v) => v.key === key)) { flasher(`Déjà scanné : ${code}`); return prev; }
      const a = parSerie.get(key) || null;
      let type = 'inconnu';
      if (a) type = Number(a.entrepot_id) === Number(entrepotId) ? 'present' : 'deplace';
      return [{ key, code, actif: a, type, at: Date.now() }, ...prev];
    });
  }, [parSerie, entrepotId]);

  // Compteurs / rapport
  const presents = vus.filter((v) => v.type === 'present');
  const deplaces = vus.filter((v) => v.type === 'deplace');
  const inconnus = vus.filter((v) => v.type === 'inconnu');
  const manquants = useMemo(
    () => attendus.filter((a) => !vus.some((v) => v.key === a.numero_serie?.toLowerCase())),
    [attendus, vus]
  );

  const entrepotNom = entrepots.find((e) => Number(e.id) === Number(entrepotId))?.nom || '';

  const TYPE_META = {
    present: { label: 'Présent', tone: 'success', icon: CheckCircle2 },
    deplace: { label: 'Déplacé', tone: 'warning', icon: AlertTriangle },
    inconnu: { label: 'Inconnu', tone: 'error', icon: HelpCircle },
  };

  const reset = () => { setVus([]); setStep('setup'); };

  return (
    <div className="modal modal-open">
      <div className="modal-box relative bg-base-100 rounded-xl shadow-xl border border-base-200 max-w-2xl">
        <button onClick={onClose} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><ClipboardCheck className="w-5 h-5 text-primary" /> Session d'audit physique</h3>

        {/* ── Étape 1 : choix de l'entrepôt ── */}
        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/60">Choisis l'entrepôt à auditer, puis scanne les équipements un par un. La liste se remplit à chaque scan.</p>
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Entrepôt à auditer</span></label>
              <select value={entrepotId} onChange={(e) => setEntrepotId(e.target.value)} className="select select-bordered rounded-xl" disabled={loading}>
                <option value="">{loading ? 'Chargement…' : '— Choisir un entrepôt —'}</option>
                {entrepots.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            {entrepotId && (
              <div className="rounded-xl border border-base-200 bg-base-200/40 p-3 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-base-content/50" /> <span className="font-semibold">{attendus.length}</span> actif(s) attendu(s) dans « {entrepotNom} ».
              </div>
            )}
            <div className="modal-action">
              <button onClick={onClose} className="btn btn-ghost rounded-xl">Annuler</button>
              <button onClick={() => setStep('scanning')} disabled={!entrepotId} className="btn btn-primary rounded-xl gap-2"><PlayCircle className="w-4 h-4" /> Démarrer la session</button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : scan continu + liste cumulative ── */}
        {step === 'scanning' && (
          <div className="space-y-4">
            {/* Compteurs */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-base-200 bg-base-200/40 p-2"><p className="text-[11px] uppercase text-base-content/50 font-semibold">Scannés</p><p className="text-xl font-bold tabular-nums">{vus.length}</p></div>
              <div className="rounded-xl border border-success/20 bg-success/5 p-2"><p className="text-[11px] uppercase text-base-content/50 font-semibold">Présents</p><p className="text-xl font-bold tabular-nums text-success">{presents.length}/{attendus.length}</p></div>
              <div className="rounded-xl border border-error/20 bg-error/5 p-2"><p className="text-[11px] uppercase text-base-content/50 font-semibold">Manquants</p><p className="text-xl font-bold tabular-nums text-error">{manquants.length}</p></div>
            </div>

            <CameraReader onResult={onScan} continuous regionId="audit-session-region" />
            {flash && <p className="text-center text-xs font-semibold text-warning">{flash}</p>}

            {/* Liste cumulative (plus récent en haut) */}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-base-200 divide-y divide-base-200">
              {vus.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">Aucun scan pour l'instant…</p>
              ) : vus.map((v) => {
                const m = TYPE_META[v.type];
                const Icon = m.icon;
                return (
                  <div key={v.key + v.at} className="flex items-center gap-3 px-3 py-2">
                    <Icon className={`w-4 h-4 shrink-0 ${v.type === 'present' ? 'text-success' : v.type === 'deplace' ? 'text-warning' : 'text-error'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold truncate">{v.code}</p>
                      <p className="text-xs text-base-content/50 truncate">{v.actif ? `${v.actif.produit_libelle || '—'}${v.type === 'deplace' ? ` · réf. : ${v.actif.entrepot_nom || '?'}` : ''}` : 'absent de la base'}</p>
                    </div>
                    <StatusBadge label={m.label} tone={m.tone} icon={null} />
                  </div>
                );
              })}
            </div>

            <div className="modal-action flex-wrap gap-2">
              <button onClick={onClose} className="btn btn-ghost rounded-xl">Fermer</button>
              <button onClick={() => setStep('report')} className="btn btn-primary rounded-xl gap-2"><ClipboardCheck className="w-4 h-4" /> Terminer & voir le rapport</button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : rapport d'écarts ── */}
        {step === 'report' && (
          <div className="space-y-4">
            <p className="text-sm text-base-content/60">Audit de « <span className="font-semibold">{entrepotNom}</span> » — {presents.length}/{attendus.length} présents.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <Stat icon={CheckCircle2} tone="success" n={presents.length} label="Présents" />
              <Stat icon={PackageX}     tone="error"   n={manquants.length} label="Manquants" />
              <Stat icon={AlertTriangle} tone="warning" n={deplaces.length} label="Déplacés" />
              <Stat icon={HelpCircle}   tone="neutral" n={inconnus.length} label="Inconnus" />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-4">
              <RapportListe titre="Manquants (attendus mais non scannés)" tone="error" items={manquants.map(a => ({ code: a.numero_serie, sub: a.produit_libelle }))} />
              <RapportListe titre="Déplacés (ici mais rattachés ailleurs)" tone="warning" items={deplaces.map(v => ({ code: v.code, sub: `${v.actif?.produit_libelle || ''} · réf. : ${v.actif?.entrepot_nom || '?'}` }))} />
              <RapportListe titre="Inconnus (absents de la base)" tone="neutral" items={inconnus.map(v => ({ code: v.code, sub: '' }))} />
            </div>

            <div className="modal-action flex-wrap gap-2">
              <button onClick={() => setStep('scanning')} className="btn btn-ghost rounded-xl gap-2"><ScanLine className="w-4 h-4" /> Reprendre le scan</button>
              <button onClick={reset} className="btn btn-outline btn-primary rounded-xl gap-2"><RefreshCw className="w-4 h-4" /> Nouvelle session</button>
              <button onClick={onClose} className="btn btn-primary rounded-xl">Fermer</button>
            </div>
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

function Stat({ icon: Icon, tone, n, label }) {
  const cls = { success: 'text-success', error: 'text-error', warning: 'text-warning', neutral: 'text-base-content/60' }[tone];
  return (
    <div className="rounded-xl border border-base-200 bg-base-200/40 p-3">
      <Icon className={`w-5 h-5 mx-auto ${cls}`} />
      <p className={`text-xl font-bold tabular-nums mt-1 ${cls}`}>{n}</p>
      <p className="text-[11px] uppercase text-base-content/50 font-semibold">{label}</p>
    </div>
  );
}

function RapportListe({ titre, tone, items }) {
  if (!items.length) return null;
  const dot = { error: 'bg-error', warning: 'bg-warning', neutral: 'bg-base-content/40' }[tone];
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-base-content/50 mb-1">{titre} ({items.length})</p>
      <div className="rounded-xl border border-base-200 divide-y divide-base-200">
        {items.map((it, i) => (
          <div key={it.code + i} className="flex items-center gap-3 px-3 py-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold truncate">{it.code}</p>
              {it.sub && <p className="text-xs text-base-content/50 truncate">{it.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
