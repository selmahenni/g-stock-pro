'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Inbox, Send, RefreshCw, AlertCircle, X, Plus, Users, AtSign,
  CheckCircle2, ChevronDown, ChevronUp, User, Globe,
} from 'lucide-react';

const API = 'http://localhost:5000/api';

const roleLabel = {
  super_admin: 'Super-admin', magasinier: 'Magasinier', technicien: 'Technicien', consultant: 'Consultant',
};

/**
 * @component PageMessagerie
 * @description Boîte de messagerie : réception (messages internes reçus), envoyés,
 * et composition d'un message interne (collègue) ou externe (e-mail, ex. service achat).
 */
export default function PageMessagerie() {
  const [onglet, setOnglet] = useState('reception'); // 'reception' | 'envoyes'
  const [reception, setReception] = useState([]);
  const [nonLus, setNonLus] = useState(0);
  const [envoyes, setEnvoyes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ouvert, setOuvert] = useState(null); // id du message déplié
  const [showCompose, setShowCompose] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rRec, rEnv] = await Promise.all([
        fetch(`${API}/messages`, { credentials: 'include' }),
        fetch(`${API}/messages/envoyes`, { credentials: 'include' }),
      ]);
      if (rRec.status === 401 || rRec.status === 403) { window.location.href = '/login'; return; }
      if (!rRec.ok || !rEnv.ok) throw new Error('Erreur serveur lors du chargement.');
      const dRec = await rRec.json();
      const dEnv = await rEnv.json();
      setReception(dRec.messages || []);
      setNonLus(dRec.non_lues ?? dRec.non_lus ?? 0);
      setEnvoyes(dEnv.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ouvrirMessage = async (m) => {
    const estOuvert = ouvert === m.id;
    setOuvert(estOuvert ? null : m.id);
    if (!estOuvert && !m.est_lu) {
      setReception(prev => prev.map(x => (x.id === m.id ? { ...x, est_lu: true } : x)));
      setNonLus(prev => Math.max(prev - 1, 0));
      try { await fetch(`${API}/messages/${m.id}/lu`, { method: 'PATCH', credentials: 'include' }); } catch { /* resync */ }
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const liste = onglet === 'reception' ? reception : envoyes;

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content flex items-center gap-2">
              <Mail className="w-7 h-7 text-primary" /> Messagerie
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {nonLus > 0 ? `${nonLus} message${nonLus > 1 ? 's' : ''} non lu${nonLus > 1 ? 's' : ''}` : 'Aucun message non lu.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button onClick={() => setShowCompose(true)} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4" /> Nouveau message
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOnglet('reception')} className={`btn btn-sm rounded-xl gap-2 ${onglet === 'reception' ? 'btn-primary' : 'btn-ghost border border-base-200'}`}>
            <Inbox className="w-4 h-4" /> Réception
            <span className={`badge badge-sm ${onglet === 'reception' ? 'bg-primary-content/20 text-primary-content border-0' : 'badge-ghost'}`}>{reception.length}</span>
          </button>
          <button onClick={() => setOnglet('envoyes')} className={`btn btn-sm rounded-xl gap-2 ${onglet === 'envoyes' ? 'btn-primary' : 'btn-ghost border border-base-200'}`}>
            <Send className="w-4 h-4" /> Envoyés
            <span className={`badge badge-sm ${onglet === 'envoyes' ? 'bg-primary-content/20 text-primary-content border-0' : 'badge-ghost'}`}>{envoyes.length}</span>
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des messages...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur</h3>
              <p className="text-sm text-base-content/70 mt-1">{error}</p>
              <button onClick={fetchData} className="btn btn-sm btn-outline border-error/40 text-error font-semibold rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : liste.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 bg-base-100 rounded-2xl shadow-md border border-base-200 text-center">
            <div className="p-4 bg-primary/10 rounded-full text-primary">{onglet === 'reception' ? <Inbox className="w-8 h-8" /> : <Send className="w-8 h-8" />}</div>
            <p className="text-base font-semibold text-base-content/70">{onglet === 'reception' ? 'Boîte de réception vide' : 'Aucun message envoyé'}</p>
            <p className="text-sm text-base-content/50">{onglet === 'reception' ? 'Vous n\'avez reçu aucun message.' : 'Composez votre premier message.'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {liste.map((m) => {
              const estRec = onglet === 'reception';
              const expanded = ouvert === m.id;
              // Étiquette de l'interlocuteur
              const interlocuteur = estRec
                ? (m.expediteur_nom || 'Utilisateur supprimé')
                : (m.est_externe ? m.destinataire_email : (m.destinataire_nom || 'Utilisateur supprimé'));
              return (
                <li key={m.id} className={`bg-base-100 rounded-2xl border shadow-sm hover:shadow-md transition-all ${estRec && !m.est_lu ? 'border-primary/30 bg-primary/[0.03]' : 'border-base-200'}`}>
                  <button onClick={() => ouvrirMessage(m)} className="w-full text-left p-4 flex items-start gap-4">
                    <span className={`p-2.5 rounded-xl shrink-0 border ${m.est_externe ? 'text-violet-600 bg-violet-500/10 border-violet-500/20' : 'text-sky-600 bg-sky-500/10 border-sky-500/20'}`}>
                      {m.est_externe ? <Globe className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base-content/90">{m.sujet}</span>
                        {m.est_externe && <span className="badge badge-sm rounded-md font-semibold border text-violet-600 bg-violet-500/10 border-violet-500/20 gap-1"><AtSign className="w-3 h-3" /> Externe</span>}
                        {estRec && !m.est_lu && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-base-content/50 mt-1">
                        {estRec ? 'De' : 'À'} : <span className="font-medium text-base-content/70">{interlocuteur}</span> · {fmtDate(m.cree_le)}
                      </p>
                      {!expanded && <p className="text-sm text-base-content/60 mt-1 truncate">{m.corps}</p>}
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-base-content/40 shrink-0" /> : <ChevronDown className="w-4 h-4 text-base-content/40 shrink-0" />}
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4 pl-[4.5rem]">
                      <div className="bg-base-200/50 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed">{m.corps}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); fetchData(); setOnglet('envoyes'); }}
        />
      )}
    </div>
  );
}

/**
 * @component ComposeModal
 * @description Modale de composition : interne (collègue) ou externe (adresse e-mail).
 */
function ComposeModal({ onClose, onSent }) {
  const [mode, setMode] = useState('interne'); // 'interne' | 'externe'
  const [annuaire, setAnnuaire] = useState([]);
  const [destinataireId, setDestinataireId] = useState('');
  const [destinataireEmail, setDestinataireEmail] = useState('');
  const [copieEmail, setCopieEmail] = useState(false);
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/messages/annuaire`, { credentials: 'include' });
        if (res.ok) { const d = await res.json(); setAnnuaire(d.utilisateurs || []); }
      } catch { /* annuaire indisponible : l'envoi externe reste possible */ }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!sujet.trim() || !corps.trim()) { setErr('Le sujet et le message sont obligatoires.'); return; }
    if (mode === 'interne' && !destinataireId) { setErr('Choisissez un collègue destinataire.'); return; }
    if (mode === 'externe' && !destinataireEmail.trim()) { setErr('Saisissez une adresse e-mail.'); return; }

    const payload = mode === 'externe'
      ? { destinataire_email: destinataireEmail.trim(), sujet, corps }
      : { destinataire_id: Number(destinataireId), sujet, corps, copie_email: copieEmail };

    try {
      setSending(true);
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Erreur serveur (${res.status})`);
      onSent();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box relative bg-base-100 rounded-xl shadow-xl border border-base-200 max-w-lg">
        <button onClick={onClose} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4"><Send className="w-5 h-5 text-primary" /> Nouveau message</h3>

        {/* Sélecteur de mode */}
        <div className="flex gap-1 mb-4 p-1 bg-base-200/60 rounded-xl">
          <button type="button" onClick={() => setMode('interne')} className={`btn btn-sm rounded-lg flex-1 gap-2 ${mode === 'interne' ? 'btn-primary' : 'btn-ghost'}`}>
            <Users className="w-4 h-4" /> Collègue
          </button>
          <button type="button" onClick={() => setMode('externe')} className={`btn btn-sm rounded-lg flex-1 gap-2 ${mode === 'externe' ? 'btn-primary' : 'btn-ghost'}`}>
            <AtSign className="w-4 h-4" /> E-mail externe
          </button>
        </div>

        {err && (
          <div className="alert alert-error rounded-xl mb-4 py-2 text-sm">
            <AlertCircle className="w-4 h-4" /><span>{err}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === 'interne' ? (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Destinataire</span></label>
                <select required value={destinataireId} onChange={(e) => setDestinataireId(e.target.value)} className="select select-bordered rounded-xl w-full">
                  <option value="">— Choisir un collègue —</option>
                  {annuaire.map((u) => (
                    <option key={u.id} value={u.id}>{u.nom_complet} ({roleLabel[u.role] || u.role})</option>
                  ))}
                </select>
              </div>
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={copieEmail} onChange={(e) => setCopieEmail(e.target.checked)} />
                <span className="label-text">Envoyer aussi une copie par e-mail</span>
              </label>
            </>
          ) : (
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Adresse e-mail</span></label>
              <input type="email" required value={destinataireEmail} onChange={(e) => setDestinataireEmail(e.target.value)} placeholder="ex. achat@fournisseur.com" className="input input-bordered rounded-xl w-full" />
              <span className="text-xs text-base-content/50 mt-1">Le message partira par e-mail (ex. service achat).</span>
            </div>
          )}

          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Sujet</span></label>
            <input type="text" required value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Objet du message" className="input input-bordered rounded-xl w-full" />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Message</span></label>
            <textarea required value={corps} onChange={(e) => setCorps(e.target.value)} placeholder="Votre message..." className="textarea textarea-bordered rounded-xl w-full min-h-28" />
          </div>

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">Annuler</button>
            <button type="submit" disabled={sending} className="btn btn-primary rounded-xl gap-2">
              {sending && <span className="loading loading-spinner loading-sm"></span>}
              <Send className="w-4 h-4" /> Envoyer
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
